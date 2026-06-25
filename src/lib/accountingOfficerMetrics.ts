import { Transaction, Payable, Receivable, Company } from "../types";

export type AccountingTask = {
  id: string;
  type: "missing_receipt" | "overdue_ap" | "overdue_ar" | "pending_review" | "cash_count" | "unencoded_payable" | "unencoded_receivable";
  companyId: string;
  title: string;
  subtitle?: string;
  amount?: number;
  dueDate?: string; // or txnDate
  priority: "high" | "warning" | "normal";
  actionLabel: string;
};

export function getTodayAccountingSummary(transactions: Transaction[], payables: Payable[], receivables: Receivable[]) {
  const today = new Date().toISOString().split("T")[0];
  const todayTxns = transactions.filter(t => t.txnDate === today);
  
  const totalEncoded = todayTxns.length;
  const missingReceipts = transactions.filter(t => !t.receiptPath && t.status !== "rejected").length;
  const overduePayables = payables.filter(p => p.dueDate < today && p.status === "unpaid").length;
  const uncollectedReceivables = receivables.filter(r => r.dueDate < today && r.status === "uncollected").length;

  return {
    totalEncoded,
    missingReceipts,
    overduePayables,
    uncollectedReceivables
  };
}

export function getMissingReceiptTransactions(transactions: Transaction[]) {
  return transactions.filter(t => !t.receiptPath && t.status !== "rejected").sort((a, b) => b.txnDate.localeCompare(a.txnDate));
}

export function getOverduePayables(payables: Payable[]) {
  const today = new Date().toISOString().split("T")[0];
  return payables.filter(p => p.dueDate < today && p.status === "unpaid").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function getOverdueReceivables(receivables: Receivable[]) {
  const today = new Date().toISOString().split("T")[0];
  return receivables.filter(r => r.dueDate < today && r.status === "uncollected").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function getPendingApprovalReadyItems(transactions: Transaction[]) {
  return transactions.filter(t => t.status === "pending").sort((a, b) => b.txnDate.localeCompare(a.txnDate));
}

export function getDailyClosingChecklist() {
  return [
    { id: "cash_in", label: "All cash-in encoded", done: false },
    { id: "cash_out", label: "All cash-out encoded", done: false },
    { id: "receipts", label: "Receipts attached", done: false },
    { id: "ap_ar", label: "AP/AR updated", done: false },
    { id: "cash_count", label: "Cash count completed", done: false },
    { id: "deposits", label: "Bank deposits recorded", done: false },
    { id: "approvals", label: "Pending approvals submitted", done: false },
    { id: "report", label: "Daily report exported", done: false },
  ];
}

export function getAccountingTaskBoard(transactions: Transaction[], payables: Payable[], receivables: Receivable[]): AccountingTask[] {
  const tasks: AccountingTask[] = [];
  const today = new Date().toISOString().split("T")[0];

  const missingReceipts = getMissingReceiptTransactions(transactions);
  missingReceipts.forEach(t => {
    tasks.push({
      id: `task-receipt-${t.id}`,
      type: "missing_receipt",
      companyId: t.companyId,
      title: t.purpose || "Missing Receipt",
      subtitle: t.type === "cash_in" ? "Cash In" : "Cash Out",
      amount: t.amount,
      dueDate: t.txnDate,
      priority: "warning",
      actionLabel: "Attach Receipt"
    });
  });

  const overdueAp = getOverduePayables(payables);
  overdueAp.forEach(p => {
    tasks.push({
      id: `task-ap-${p.id}`,
      type: "overdue_ap",
      companyId: p.companyId,
      title: `Pay ${p.payee}`,
      subtitle: p.description,
      amount: p.amount,
      dueDate: p.dueDate,
      priority: "high",
      actionLabel: "Mark Paid"
    });
  });

  const overdueAr = getOverdueReceivables(receivables);
  overdueAr.forEach(r => {
    tasks.push({
      id: `task-ar-${r.id}`,
      type: "overdue_ar",
      companyId: r.companyId,
      title: `Collect from ${r.payer}`,
      subtitle: r.description,
      amount: r.amount,
      dueDate: r.dueDate,
      priority: "high",
      actionLabel: "Mark Collected"
    });
  });

  const pendingTxns = getPendingApprovalReadyItems(transactions);
  pendingTxns.forEach(t => {
    tasks.push({
      id: `task-pending-${t.id}`,
      type: "pending_review",
      companyId: t.companyId,
      title: t.purpose,
      subtitle: "Requires Approval",
      amount: t.amount,
      dueDate: t.txnDate,
      priority: "normal",
      actionLabel: "View Details"
    });
  });

  return tasks;
}
