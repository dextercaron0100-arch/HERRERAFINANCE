import { Transaction, Payable, Receivable, CashAccount, Budget, Company, Category } from "../types";

export function getMoneyFlowSummary(transactions: Transaction[]) {
  const approved = transactions.filter((t) => t.status === "approved");
  const cashIn = approved.filter((t) => t.type === "cash_in").reduce((sum, t) => sum + t.amount, 0);
  const cashOut = approved.filter((t) => t.type === "cash_out").reduce((sum, t) => sum + t.amount, 0);
  
  return {
    cashIn,
    cashOut,
    netCashFlow: cashIn - cashOut,
  };
}

export function getProfitSummary(transactions: Transaction[], categories: Category[]) {
  const approved = transactions.filter((t) => t.status === "approved");
  
  // Find Capital categories to exclude them from revenue
  const capitalCategoryIds = categories
    .filter(c => c.name.toLowerCase().includes("capital"))
    .map(c => c.id);

  const revenue = approved
    .filter((t) => t.type === "cash_in" && !capitalCategoryIds.includes(t.categoryId))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const cogsCategoryNames = ["inventory", "supplies", "materials", "cogs", "purchases", "cost of goods"];
  const payrollCategoryNames = ["payroll", "salary", "wages", "benefits"];
  
  const cogsCategoryIds = categories
    .filter(c => cogsCategoryNames.some(name => c.name.toLowerCase().includes(name)))
    .map(c => c.id);
    
  const payrollCategoryIds = categories
    .filter(c => payrollCategoryNames.some(name => c.name.toLowerCase().includes(name)))
    .map(c => c.id);

  const cogs = approved
    .filter((t) => t.type === "cash_out" && cogsCategoryIds.includes(t.categoryId))
    .reduce((sum, t) => sum + t.amount, 0);
    
  const payroll = approved
    .filter((t) => t.type === "cash_out" && payrollCategoryIds.includes(t.categoryId))
    .reduce((sum, t) => sum + t.amount, 0);
    
  const operatingExpenses = approved
    .filter(
      (t) =>
        t.type === "cash_out" &&
        !cogsCategoryIds.includes(t.categoryId) &&
        !payrollCategoryIds.includes(t.categoryId)
    )
    .reduce((sum, t) => sum + t.amount, 0);
    
  const netProfit = revenue - cogs - operatingExpenses - payroll;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  
  return {
    revenue,
    cogs,
    operatingExpenses,
    payroll,
    netProfit,
    profitMargin,
  };
}

export function getCompanyProfitComparison(companies: Company[], allTransactions: Transaction[], categories: Category[]) {
  return companies.map(company => {
    const txns = allTransactions.filter(t => t.companyId === company.id);
    const flow = getMoneyFlowSummary(txns);
    const profit = getProfitSummary(txns, categories);
    
    return {
      companyId: company.id,
      companyName: company.name,
      companyCode: company.code,
      ...flow,
      ...profit,
      status: profit.profitMargin >= 20 ? 'Healthy' : profit.profitMargin >= 10 ? 'Watch' : profit.profitMargin >= 0 ? 'Low Profit' : 'Loss'
    };
  }).sort((a, b) => b.netProfit - a.netProfit);
}

export function getCashFlowTimeline(transactions: Transaction[], days: number = 30) {
  const approved = transactions.filter((t) => t.status === "approved");
  const data: { date: string; cashIn: number; cashOut: number; netCash: number }[] = [];
  
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    
    const dayTxns = approved.filter(t => t.txnDate === dateStr);
    const cashIn = dayTxns.filter(t => t.type === "cash_in").reduce((sum, t) => sum + t.amount, 0);
    const cashOut = dayTxns.filter(t => t.type === "cash_out").reduce((sum, t) => sum + t.amount, 0);
    const netCash = cashIn - cashOut;
    
    data.push({
      date: dateStr,
      cashIn,
      cashOut,
      netCash,
    });
  }
  
  return data;
}

export function getUpcomingCashRisk(payables: Payable[], receivables: Receivable[], cashAccounts: CashAccount[]) {
  const todayStr = new Date().toISOString().split("T")[0];
  
  // Upcoming 7 days
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];
  
  const upcomingPayables = payables
    .filter((p) => p.status === "unpaid" && p.dueDate >= todayStr && p.dueDate <= nextWeekStr)
    .reduce((sum, p) => sum + p.amount, 0);
    
  const overduePayables = payables
    .filter((p) => p.status === "unpaid" && p.dueDate < todayStr)
    .reduce((sum, p) => sum + p.amount, 0);
    
  const upcomingReceivables = receivables
    .filter((r) => r.status === "unpaid" && r.dueDate >= todayStr && r.dueDate <= nextWeekStr)
    .reduce((sum, r) => sum + r.amount, 0);
    
  const overdueReceivables = receivables
    .filter((r) => r.status === "unpaid" && r.dueDate < todayStr)
    .reduce((sum, r) => sum + r.amount, 0);
    
  const currentCash = cashAccounts.filter(a => a.isActive).reduce((sum, a) => sum + a.currentBalance, 0);
  
  const projectedCash = currentCash + upcomingReceivables - upcomingPayables;
  
  return {
    upcomingPayables,
    overduePayables,
    upcomingReceivables,
    overdueReceivables,
    currentCash,
    projectedCash,
  };
}

export function getMoneyLeakAlerts(
  transactions: Transaction[],
  payables: Payable[],
  receivables: Receivable[],
  budgets: { categoryId: string; categoryName: string; plannedAmount: number; actualAmount: number; variance: number; usage: number }[]
) {
  const alerts: { type: 'high' | 'warning' | 'info'; message: string }[] = [];
  
  // Missing receipts
  const missingReceipts = transactions.filter(t => t.status === "approved" && !t.receiptUrl && !t.attachmentUrl);
  if (missingReceipts.length > 0) {
    alerts.push({ type: 'info', message: `${missingReceipts.length} transactions missing receipts or attachments` });
  }
  
  // Overdue Payables
  const overdueAP = payables.filter(p => p.status === "unpaid" && p.dueDate < new Date().toISOString().split("T")[0]);
  if (overdueAP.length > 0) {
    const amount = overdueAP.reduce((sum, p) => sum + p.amount, 0);
    alerts.push({ type: 'high', message: `₱${amount.toLocaleString()} unpaid payables overdue` });
  }
  
  // Budget Usage
  budgets.forEach(b => {
    if (b.usage >= 100) {
      alerts.push({ type: 'high', message: `${b.categoryName} spending exceeded budget (${b.usage.toFixed(0)}%)` });
    } else if (b.usage >= 80) {
      alerts.push({ type: 'warning', message: `${b.categoryName} spending reached ${b.usage.toFixed(0)}% of budget` });
    }
  });
  
  return alerts;
}
