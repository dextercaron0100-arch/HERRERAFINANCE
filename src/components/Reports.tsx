/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  TrendingUp,
  Coins,
  Cpu,
  Bookmark,
  Calendar,
  Layers
} from 'lucide-react';
import {
  getTransactions,
  getBudgetVsActual,
  getDailyBalances,
  getCompanies,
  getCategories,
  useDBUpdate
} from '../data/mockDatabase';

interface ReportsProps {
  userId: string;
  companyId: string;
}

type ReportType = 'cashflow' | 'pl' | 'budget_actual' | 'daily_position';

export default function Reports({ userId, companyId }: ReportsProps) {
  useDBUpdate();
  const [activeReport, setActiveReport] = useState<ReportType>('cashflow');
  const [selectedMonth, setSelectedMonth] = useState('2026-06-01');

  const companies = getCompanies();
  const currentCompany = companies.find(c => c.id === companyId);
  const txns = getTransactions(userId, companyId);
  const categories = getCategories(companyId);

  // PESO FORMATTER
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(num);
  };

  // -------------------------------------------------------------
  // REPORT 1: CASH FLOW
  // -------------------------------------------------------------
  const cashFlowReport = useMemo(() => {
    const approved = txns.filter(t => t.status === 'approved' && t.txnDate.startsWith(selectedMonth.substring(0, 7)));
    const inflows = approved.filter(t => t.type === 'cash_in');
    const outflows = approved.filter(t => t.type === 'cash_out');

    const totalIn = inflows.reduce((sum, t) => sum + t.amount, 0);
    const totalOut = outflows.reduce((sum, t) => sum + t.amount, 0);
    const netFlow = totalIn - totalOut;

    // Group inflows / outflows by category
    const inByCat = inflows.reduce((acc, t) => {
      acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const outByCat = outflows.reduce((acc, t) => {
      acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return { totalIn, totalOut, netFlow, inByCat, outByCat };
  }, [txns, selectedMonth]);

  // -------------------------------------------------------------
  // REPORT 2: PROFIT & LOSS
  // -------------------------------------------------------------
  const plReport = useMemo(() => {
    const approved = txns.filter(t => t.status === 'approved' && t.txnDate.startsWith(selectedMonth.substring(0, 7)));
    
    // Revenue categories
    const salesCatIds = categories.filter(c => c.type === 'cash_in' && (c.name.includes('sales') || c.name.includes('collection'))).map(c => c.id);
    const revenue = approved.filter(t => salesCatIds.includes(t.categoryId)).reduce((s, t) => s + t.amount, 0);

    // COGS
    const cogsCatIds = categories.filter(c => c.name.includes('supplies') || c.name.includes('inventory')).map(c => c.id);
    const cogs = approved.filter(t => cogsCatIds.includes(t.categoryId)).reduce((s, t) => s + t.amount, 0);

    const grossProfit = revenue - cogs;

    // Operating expenses
    const opexTxns = approved.filter(t => t.type === 'cash_out' && !cogsCatIds.includes(t.categoryId));
    const totalOpex = opexTxns.reduce((s, t) => s + t.amount, 0);

    const netOpIncome = grossProfit - totalOpex;

    return { revenue, cogs, grossProfit, totalOpex, netOpIncome };
  }, [txns, categories, selectedMonth]);

  // -------------------------------------------------------------
  // REPORT 3: BUDGET VS ACTUAL
  // -------------------------------------------------------------
  const budgetVsActualData = useMemo(() => {
    return getBudgetVsActual(companyId, selectedMonth);
  }, [companyId, selectedMonth]);

  // -------------------------------------------------------------
  // REPORT 4: DAILY TREASURY POSITION
  // -------------------------------------------------------------
  const dailyBalancesData = useMemo(() => {
    const comBalances = getDailyBalances(companyId);
    return comBalances.filter(b => b.balanceDate.startsWith(selectedMonth.substring(0, 7)));
  }, [companyId, selectedMonth]);

  // -------------------------------------------------------------
  // SHEETS EXPORTS USING INTEGRATED XLSX ENGINE
  // -------------------------------------------------------------
  const handleExcelExport = () => {
    let wsData: any[] = [];
    let title = 'Financial_Report';

    if (activeReport === 'cashflow') {
      title = `${currentCompany?.code}_CashFlow_${selectedMonth.substring(0, 7)}`;
      wsData = [
        ['Corporate Cashflow Statement (Approved Ledgers)'],
        [`Company: ${currentCompany?.name} (${currentCompany?.code})`],
        [`Report Period: ${selectedMonth.substring(0, 7)}`],
        [],
        ['CASH INFLOWS (SOURCES)', 'VAL PHP'],
      ];
      Object.entries(cashFlowReport.inByCat).forEach(([catId, val]) => {
        const catName = categories.find(c => c.id === catId)?.name || 'inflow';
        wsData.push([catName.toUpperCase(), val]);
      });
      wsData.push(['TOTAL CASH SOURCES', cashFlowReport.totalIn]);
      wsData.push([]);
      wsData.push(['CASH OUTFLOWS (DISBURSEMENTS)', 'VAL PHP']);
      Object.entries(cashFlowReport.outByCat).forEach(([catId, val]) => {
        const catName = categories.find(c => c.id === catId)?.name || 'expense';
        wsData.push([catName.toUpperCase(), val]);
      });
      wsData.push(['TOTAL CASH OUTFLOWS', cashFlowReport.totalOut]);
      wsData.push([]);
      wsData.push(['NET SURPLUS ACCRUAL', cashFlowReport.netFlow]);
    }
    else if (activeReport === 'pl') {
      title = `${currentCompany?.code}_ProfitLoss_${selectedMonth.substring(0, 7)}`;
      wsData = [
        ['Statement of Profit and Loss (P&L)'],
        [`Company: ${currentCompany?.name} (${currentCompany?.code})`],
        [`Report Period: ${selectedMonth.substring(0, 7)}`],
        [],
        ['REVENUE AND SALES INFLOWS', plReport.revenue],
        ['LESS: Cost of Goods Sold (COGS)', plReport.cogs],
        ['GROSS PROFIT MARGIN', plReport.grossProfit],
        [],
        ['LESS: Operating Expenses (OPEX)', plReport.totalOpex],
        ['NET INCOME BEFORE INCOME TAX', plReport.netOpIncome]
      ];
    }
    else if (activeReport === 'budget_actual') {
      title = `${currentCompany?.code}_BudgetVsActual_${selectedMonth.substring(0, 7)}`;
      wsData = [
        ['Budget vs Actual Spent (Variance Analyser)'],
        [`Company: ${currentCompany?.name} (${currentCompany?.code})`],
        [`Report Period: ${selectedMonth.substring(0, 7)}`],
        [],
        ['Disbursement Category', 'Planned Budget', 'Actual spent', 'Variance cushion', 'Burn pace']
      ];
      budgetVsActualData.forEach(item => {
        wsData.push([
          item.categoryName.toUpperCase(),
          item.plannedAmount,
          item.actualAmount,
          item.variance,
          `${item.usagePercent.toFixed(1)}%`
        ]);
      });
    }
    else if (activeReport === 'daily_position') {
      title = `${currentCompany?.code}_DailyBalances_${selectedMonth.substring(0, 7)}`;
      wsData = [
        ['Daily Treasury Cash Balance Schedules'],
        [`Company: ${currentCompany?.name} (${currentCompany?.code})`],
        [`Report Period: ${selectedMonth.substring(0, 7)}`],
        [],
        ['Calendar Date', 'Beginning Treasury Base', 'Deposit inflow (+)', 'Disbursement outflow (-)', 'Ending Close balance']
      ];
      dailyBalancesData.forEach(item => {
        wsData.push([
          item.balanceDate,
          item.beginningBalance,
          item.totalCashIn,
          item.totalCashOut,
          item.endingBalance
        ]);
      });
    }

    // Sheet JS routine
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Financial Report');
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  // -------------------------------------------------------------
  // TRIGGER PRINT DIALOG
  // -------------------------------------------------------------
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION PANEL */}
      <div className="bg-white border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl no-print">
        <div>
          <h1 className="text-slate-900 font-display text-lg tracking-tight flex items-center gap-1.5 font-bold">
            <Layers className="w-5 h-5 text-slate-600" />
            <span>Executive Accounts Analytics & Analytics Desk</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mt-0.5">Validate audits outputs with direct Excel and printable PDF formats.</p>
        </div>

        {/* CONTROLS BAR */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-550" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:text-slate-900 bg-white rounded-2xl text-xs focus:outline-hidden font-mono font-bold uppercase cursor-pointer"
            >
              <option value="2026-05-01">May 2026</option>
              <option value="2026-06-01">June 2026</option>
              <option value="2026-07-01">July 2026</option>
              <option value="2026-08-01">August 2026</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handlePrintReport}
              className="px-3 py-1.5 bg-[#1F1F1F] text-slate-900 hover:bg-slate-50 hover:text-black border border-slate-200 hover:border-white rounded-2xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs cursor-pointer select-none"
              title="Export statement as high-fidelity PDF document"
            >
              <Printer className="w-4 h-4" />
              <span>Export PDF Statement</span>
            </button>
            <button 
              onClick={handleExcelExport}
              className="px-3 py-1.5 bg-[#00B67A] text-white hover:bg-[#009E6B] rounded-2xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs cursor-pointer select-none"
            >
              <FileSpreadsheet className="w-4 h-4 text-zinc-700" />
              <span>Export Selected Sheet (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SEGMENT SELECTION DESK CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        <button 
          onClick={() => setActiveReport('cashflow')}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition select-none flex flex-col justify-between h-24 ${activeReport === 'cashflow' ? 'border-white bg-[#1A1A1A] shadow-xs' : 'border-slate-200 bg-white hover:border-[#444444]'}`}
        >
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Audit 01</span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Cash Flow Statement</h4>
            <p className="text-[10px] text-slate-500 font-mono">Sources vs Disbursements</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveReport('pl')}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition select-none flex flex-col justify-between h-24 ${activeReport === 'pl' ? 'border-white bg-[#1A1A1A] shadow-xs' : 'border-slate-200 bg-white hover:border-[#444444]'}`}
        >
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Audit 02</span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Profit & Loss (P&L)</h4>
            <p className="text-[10px] text-slate-500 font-mono">Revenue, COGS, Net surplus</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveReport('budget_actual')}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition select-none flex flex-col justify-between h-24 ${activeReport === 'budget_actual' ? 'border-white bg-[#1A1A1A] shadow-xs' : 'border-slate-200 bg-white hover:border-[#444444]'}`}
        >
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Audit 03</span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Budget vs Actuals</h4>
            <p className="text-[10px] text-slate-500 font-mono">Variances & cushion</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveReport('daily_position')}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition select-none flex flex-col justify-between h-24 ${activeReport === 'daily_position' ? 'border-white bg-[#1A1A1A] shadow-xs' : 'border-slate-200 bg-white hover:border-[#444444]'}`}
        >
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Audit 04</span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Daily Positions</h4>
            <p className="text-[10px] text-slate-500 font-mono">Closing treasury logs</p>
          </div>
        </button>
      </div>

      {/* MAIN REPORT CANVAS */}
      <div id="print-canvas" className="bg-white border border-slate-200 shadow-md p-8 space-y-6 rounded-2xl printable-report">
        {/* PRINT BANNER LOGO HEADER */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-display uppercase tracking-tight text-slate-900">
              {currentCompany?.name}
            </h2>
            <div className="text-[9px] font-mono text-zinc-405 bg-white border border-slate-200 px-2.5 py-1 rounded-2xl inline-block uppercase font-bold">
              AUTHORIZED OUTFLOW JOURNAL REPORT · CODE: {currentCompany?.code}
            </div>
          </div>
          <div className="text-right space-y-1 font-mono uppercase text-slate-600 text-[10px] tracking-wider">
            <h4 className="font-bold text-slate-900">INTERNAL TREASURY DEPT</h4>
            <p className="text-slate-500">VAL DATE: {new Date().toISOString().substring(0, 10)}</p>
          </div>
        </div>

        {/* REPORT 1 RENDERING: CASH FLOW */}
        {activeReport === 'cashflow' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-serif text-base text-slate-900 tracking-tight uppercase font-mono">Approved Cash Flows Statement</h3>
              <p className="text-xs text-slate-500 mt-1">Consolidated ledger entries with completed signature profiles.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SOURCES */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block border-b border-slate-200 pb-1 font-mono">
                  Cash Inflows (Sources)
                </span>
                <div className="space-y-2 text-xs">
                  {Object.entries(cashFlowReport.inByCat).map(([catId, val]) => {
                    const catName = categories.find(c => c.id === catId)?.name || 'collections';
                    return (
                      <div key={catId} className="flex justify-between font-mono text-slate-700 font-semibold">
                        <span className="uppercase text-[10px] text-slate-500">{catName}</span>
                        <span>{formatPeso(val as number)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200/60 pt-2 text-xs font-mono">
                    <span>TOTAL SOURCES</span>
                    <span>{formatPeso(cashFlowReport.totalIn)}</span>
                  </div>
                </div>
              </div>

              {/* DISBURSEMENTS */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block border-b border-slate-200 pb-1 font-mono">
                  Cash Outflows (Disbursements)
                </span>
                <div className="space-y-2 text-xs">
                  {Object.entries(cashFlowReport.outByCat).map(([catId, val]) => {
                    const catName = categories.find(c => c.id === catId)?.name || 'operations';
                    return (
                      <div key={catId} className="flex justify-between font-mono text-zinc-350 font-medium">
                        <span className="uppercase text-[10px] text-slate-500">{catName}</span>
                        <span>{formatPeso(val as number)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200/60 pt-2 text-xs font-mono">
                    <span>TOTAL DISBURSEMENTS</span>
                    <span>{formatPeso(cashFlowReport.totalOut)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* NET SURPLUS SUMMARY BAR */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-medium font-mono">
              <span className="font-bold text-slate-600 uppercase">Net Treasury Change (Surplus Accrual)</span>
              <span className={`font-extrabold text-base ${cashFlowReport.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPeso(cashFlowReport.netFlow)}
              </span>
            </div>
          </div>
        )}

        {/* REPORT 2 RENDERING: PL */}
        {activeReport === 'pl' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-serif text-slate-900 tracking-tight font-bold text-sm uppercase font-mono">Statement of Corporate Profit & Loss</h3>
              <p className="text-xs text-slate-500 mt-1">Summarizes operational revenue accruals less cost structure accounts.</p>
            </div>

            <div className="space-y-4 max-w-xl mx-auto border border-slate-200 p-6 text-xs bg-white rounded-2xl font-mono">
              <div className="flex justify-between font-bold text-slate-900 pb-2 border-b border-slate-200">
                <span>REVENUE AND CLIENT SALES INFLOWS</span>
                <span>{formatPeso(plReport.revenue)}</span>
              </div>
              
              <div className="flex justify-between text-slate-600">
                <span>LESS: Cost of Goods Sold (COGS supplies)</span>
                <span className="text-rose-400">({formatPeso(plReport.cogs)})</span>
              </div>

              <div className="flex justify-between font-bold text-slate-900 py-2 border-b border-slate-200">
                <span>GROSS OPERATING SURPLUS</span>
                <span>{formatPeso(plReport.grossProfit)}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>LESS: Operational Administrative Expenditures (OPEX)</span>
                <span className="text-rose-400">({formatPeso(plReport.totalOpex)})</span>
              </div>

              <div className="flex justify-between font-extrabold text-slate-900 pt-3 border-t-2 border-dashed border-slate-200 text-sm">
                <span>NET ACCOUNTING INCOME SURPLUS</span>
                <span className="text-emerald-400">{formatPeso(plReport.netOpIncome)}</span>
              </div>
            </div>
          </div>
        )}

        {/* REPORT 3 RENDERING: BUDGET VS ACTUAL */}
        {activeReport === 'budget_actual' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-serif text-base text-slate-900 tracking-tight uppercase font-mono">Expenses Budget Variance Schedule</h3>
              <p className="text-xs text-slate-500 mt-1">Evaluates actual monthly expenditures against pre-registered planned values.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-500 text-slate-600 font-medium font-mono uppercase tracking-[1px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Category Class</th>
                    <th className="p-2.5 text-right">Planned Budget</th>
                    <th className="p-2.5 text-right">Actual spent</th>
                    <th className="p-2.5 text-right">Remaining Cushion</th>
                    <th className="p-2.5 text-center">Ratios %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {budgetVsActualData.map((item, idx) => {
                    return (
                      <tr key={idx} className="hover:bg-slate-50/30">
                        <td className="p-2.5 uppercase font-display font-bold text-slate-900">{item.categoryName}</td>
                        <td className="p-2.5 text-right font-mono text-slate-700">{formatPeso(item.plannedAmount)}</td>
                        <td className="p-2.5 text-right font-mono text-slate-900">{formatPeso(item.actualAmount)}</td>
                        <td className={`p-2.5 text-right font-mono font-bold ${item.variance >= 0 ? 'text-emerald-400' : 'text-rose-455'}`}>
                          {formatPeso(item.variance)}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          <span className={`px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl text-[9px] font-mono uppercase tracking-wider`}>
                            {item.usagePercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 4 RENDERING: DAILY VALUE REPORT */}
        {activeReport === 'daily_position' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-serif text-base text-slate-900 tracking-tight uppercase font-mono">Treasury Ledger: Day-by-Day Balance Schedules</h3>
              <p className="text-xs text-slate-500 mt-1">Closing corporate ledger trails tracking physical treasury balances.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-500 text-slate-600 font-medium font-mono uppercase tracking-[1px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Value Date</th>
                    <th className="p-2.5 text-right">Open Balance</th>
                    <th className="p-2.5 text-right">Approved Inflows (+)</th>
                    <th className="p-2.5 text-right">Approved Outflows (-)</th>
                    <th className="p-2.5 text-right font-bold">Closing balance (=)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {dailyBalancesData.map((item, idx) => {
                    return (
                      <tr key={idx} className="hover:bg-slate-50/30">
                        <td className="p-2.5 font-mono text-slate-600">{item.balanceDate}</td>
                        <td className="p-2.5 text-right font-mono text-zinc-405">{formatPeso(item.beginningBalance)}</td>
                        <td className="p-2.5 text-right font-mono text-emerald-400">+{formatPeso(item.totalCashIn)}</td>
                        <td className="p-2.5 text-right font-mono text-rose-455">-{formatPeso(item.totalCashOut)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatPeso(item.endingBalance)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COMPLIANCE ATTACHMENT LEGEND CARDS FOOTER */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 font-mono gap-4 mt-8 uppercase tracking-widest">
          <div>
            Certified Correct By: <b className="text-zinc-350">Finance Ledger Operations Dept</b>
          </div>
          <div>
            Data integrity secured with: <b className="text-zinc-350 font-sans">SHA-256 Ledger Signing Locks</b>
          </div>
        </div>
      </div>
    </div>
  );
}
