import {
  canAccessCompany,
  getAllCategories,
  getBudgets,
  getCashAccounts,
  getCompanies,
  getFundTransfers,
  getPayables,
  getReceivables,
  getTransactions,
} from "../data/mockDatabase";
import type {
  Budget,
  CashAccount,
  Category,
  FundTransfer,
  Payable,
  Receivable,
  Transaction,
} from "../types";

interface FinanceBotRequest {
  userId: string;
  companyId: string;
  question: string;
}

interface FinanceBotData {
  transactions: Transaction[];
  payables: Payable[];
  receivables: Receivable[];
  accounts: CashAccount[];
  transfers: FundTransfer[];
  budgets: Budget[];
  categoryById: Map<string, Category>;
  companyById: Map<string, string>;
  today: string;
  monthKey: string;
  scopeLabel: string;
}

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const formatPeso = (amount: number) => pesoFormatter.format(amount);

const formatDate = (date: string) => {
  if (!date) return "No date";
  return dateFormatter.format(new Date(`${date}T00:00:00`));
};

const getManilaDateParts = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const today = `${values.year}-${values.month}-${values.day}`;
  return {
    today,
    monthKey: `${values.year}-${values.month}`,
  };
};

const normalizeQuestion = (question: string) =>
  question
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
    .replace(/\s+/g, " ");

const includesAny = (question: string, phrases: string[]) =>
  phrases.some((phrase) => question.includes(phrase));

const sumAmounts = <T>(
  items: T[],
  amountSelector: (item: T) => number,
) => items.reduce((total, item) => total + amountSelector(item), 0);

const isPosted = (transaction: Transaction) =>
  transaction.status === "approved" || transaction.status === "completed";

const bulletList = (items: string[]) => items.map((item) => `• ${item}`).join("\n");

const loadFinanceBotData = (
  userId: string,
  companyId: string,
): FinanceBotData => {
  const { today, monthKey } = getManilaDateParts();
  const companies = getCompanies();
  const companyById = new Map(
    companies.map((company) => [company.id, company.name]),
  );
  const accessibleCompanyIds = new Set(
    companies
      .filter((company) => canAccessCompany(userId, company.id))
      .map((company) => company.id),
  );
  const accounts = getCashAccounts(companyId).filter((account) =>
    accessibleCompanyIds.has(account.companyId),
  );
  const transfers = getFundTransfers(companyId).filter(
    (transfer) =>
      accessibleCompanyIds.has(transfer.fromCompanyId) ||
      accessibleCompanyIds.has(transfer.toCompanyId),
  );
  const budgets = getBudgets(companyId, `${monthKey}-01`).filter((budget) =>
    accessibleCompanyIds.has(budget.companyId),
  );
  const categories = getAllCategories().filter((category) =>
    accessibleCompanyIds.has(category.companyId),
  );

  return {
    transactions: getTransactions(userId, companyId),
    payables: getPayables(userId, companyId),
    receivables: getReceivables(userId, companyId),
    accounts,
    transfers,
    budgets,
    categoryById: new Map(
      categories.map((category) => [category.id, category]),
    ),
    companyById,
    today,
    monthKey,
    scopeLabel:
      companyId === "all"
        ? "all accessible companies"
        : companyById.get(companyId) || "the selected company",
  };
};

const getPeriod = (question: string, data: FinanceBotData) => {
  if (includesAny(question, ["today", "ngayon", "araw na ito"])) {
    return {
      label: "today",
      matches: (transaction: Transaction) =>
        transaction.txnDate === data.today,
    };
  }
  if (
    includesAny(question, [
      "this month",
      "current month",
      "buwan",
      "monthly",
      "month",
    ])
  ) {
    return {
      label: "this month",
      matches: (transaction: Transaction) =>
        transaction.txnDate.startsWith(data.monthKey),
    };
  }
  return {
    label: "all recorded periods",
    matches: () => true,
  };
};

const answerHelp = () =>
  [
    "I am the built-in Herrera Finance Bot. I work directly from the finance records available to your account—no external AI API is used.",
    "",
    "You can ask:",
    bulletList([
      "What is our cash balance?",
      "Summarize today or this month.",
      "How much cash came in and went out?",
      "Which approvals are pending?",
      "Which payables are overdue?",
      "What should we collect first?",
      "Find missing receipts.",
      "Show top expenses or budget health.",
      "Check risks or possible money leaks.",
    ]),
  ].join("\n");

const answerCashPosition = (data: FinanceBotData) => {
  const activeAccounts = data.accounts.filter((account) => account.isActive);
  if (activeAccounts.length === 0) {
    return `No active cash, bank, or e-wallet accounts are recorded for ${data.scopeLabel}.`;
  }

  const total = sumAmounts(
    activeAccounts,
    (account) => account.currentBalance,
  );
  const byType = new Map<string, number>();
  activeAccounts.forEach((account) => {
    byType.set(
      account.accountType,
      (byType.get(account.accountType) || 0) + account.currentBalance,
    );
  });
  const accountLines = [...activeAccounts]
    .sort((left, right) => right.currentBalance - left.currentBalance)
    .slice(0, 6)
    .map((account) => {
      const company =
        data.companyById.get(account.companyId) || account.companyId;
      return `${company} — ${account.accountName}: ${formatPeso(account.currentBalance)}`;
    });

  return [
    `Current liquidity for ${data.scopeLabel}: ${formatPeso(total)} across ${activeAccounts.length} active account${activeAccounts.length === 1 ? "" : "s"}.`,
    "",
    bulletList(
      [...byType.entries()].map(
        ([type, amount]) => `${type}: ${formatPeso(amount)}`,
      ),
    ),
    "",
    "Largest account balances:",
    bulletList(accountLines),
  ].join("\n");
};

const answerCashFlow = (question: string, data: FinanceBotData) => {
  const period = getPeriod(question, data);
  const transactions = data.transactions.filter(
    (transaction) => isPosted(transaction) && period.matches(transaction),
  );
  const cashIn = sumAmounts(
    transactions.filter((transaction) => transaction.type === "cash_in"),
    (transaction) => transaction.amount,
  );
  const cashOut = sumAmounts(
    transactions.filter((transaction) => transaction.type === "cash_out"),
    (transaction) => transaction.amount,
  );
  const net = cashIn - cashOut;

  return [
    `Cash flow for ${data.scopeLabel}, ${period.label}:`,
    bulletList([
      `Cash in: ${formatPeso(cashIn)}`,
      `Cash out: ${formatPeso(cashOut)}`,
      `Net cash movement: ${formatPeso(net)}`,
      `Posted transactions: ${transactions.length}`,
    ]),
    net < 0
      ? "Cash out is higher than cash in for this period."
      : "Cash in is covering cash out for this period.",
  ].join("\n");
};

const answerProfit = (question: string, data: FinanceBotData) => {
  const periodQuestion = includesAny(question, [
    "today",
    "ngayon",
    "month",
    "buwan",
  ])
    ? question
    : `${question} this month`;
  const period = getPeriod(periodQuestion, data);
  const posted = data.transactions.filter(
    (transaction) => isPosted(transaction) && period.matches(transaction),
  );
  const inflow = sumAmounts(
    posted.filter((transaction) => transaction.type === "cash_in"),
    (transaction) => transaction.amount,
  );
  const outflow = sumAmounts(
    posted.filter((transaction) => transaction.type === "cash_out"),
    (transaction) => transaction.amount,
  );
  const net = inflow - outflow;

  return [
    `Cash-basis result for ${data.scopeLabel}, ${period.label}:`,
    bulletList([
      `Recorded inflow: ${formatPeso(inflow)}`,
      `Recorded outflow: ${formatPeso(outflow)}`,
      `Net: ${formatPeso(net)}`,
    ]),
    "This is a cash-basis estimate from posted transactions, not a full accrual P&L calculation.",
  ].join("\n");
};

const answerPendingApprovals = (data: FinanceBotData) => {
  const pendingTransactions = data.transactions.filter(
    (transaction) => transaction.status === "pending",
  );
  const pendingTransfers = data.transfers.filter(
    (transfer) => transfer.status === "Pending",
  );
  const transactionTotal = sumAmounts(
    pendingTransactions,
    (transaction) => transaction.amount,
  );
  const transferTotal = sumAmounts(
    pendingTransfers,
    (transfer) => transfer.amount,
  );

  if (pendingTransactions.length === 0 && pendingTransfers.length === 0) {
    return `There are no pending transaction or fund-transfer approvals for ${data.scopeLabel}.`;
  }

  const oldestTransactions = [...pendingTransactions]
    .sort((left, right) => left.txnDate.localeCompare(right.txnDate))
    .slice(0, 5)
    .map(
      (transaction) =>
        `${formatDate(transaction.txnDate)} — ${transaction.purpose}: ${formatPeso(transaction.amount)}`,
    );

  return [
    `Approval queue for ${data.scopeLabel}: ${pendingTransactions.length + pendingTransfers.length} pending item${pendingTransactions.length + pendingTransfers.length === 1 ? "" : "s"}.`,
    bulletList([
      `${pendingTransactions.length} transactions totaling ${formatPeso(transactionTotal)}`,
      `${pendingTransfers.length} fund transfers totaling ${formatPeso(transferTotal)}`,
    ]),
    oldestTransactions.length > 0 ? "\nOldest pending transactions:" : "",
    oldestTransactions.length > 0 ? bulletList(oldestTransactions) : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const answerPayables = (
  question: string,
  data: FinanceBotData,
  overdueOnly = false,
) => {
  const openPayables = data.payables.filter(
    (payable) => payable.status !== "paid",
  );
  const overdue = openPayables.filter(
    (payable) => payable.dueDate < data.today,
  );
  const selected = overdueOnly ? overdue : openPayables;
  const total = sumAmounts(selected, (payable) => payable.amount);
  const isPriorityQuestion = includesAny(question, [
    "first",
    "priority",
    "urgent",
    "unahin",
  ]);

  if (selected.length === 0) {
    return overdueOnly
      ? `There are no overdue payables for ${data.scopeLabel}.`
      : `There are no open payables for ${data.scopeLabel}.`;
  }

  const rows = [...selected]
    .sort((left, right) => {
      const dueDateOrder = left.dueDate.localeCompare(right.dueDate);
      return dueDateOrder || right.amount - left.amount;
    })
    .slice(0, 7)
    .map(
      (payable) =>
        `${payable.payee} — ${formatPeso(payable.amount)}, due ${formatDate(payable.dueDate)}${payable.dueDate < data.today ? " (overdue)" : ""}`,
    );

  return [
    `${overdueOnly ? "Overdue" : "Open"} payables for ${data.scopeLabel}: ${selected.length}, totaling ${formatPeso(total)}.`,
    isPriorityQuestion
      ? "Priority is ordered by earliest due date, then amount:"
      : `Overdue within this list: ${overdue.length}.`,
    bulletList(rows),
  ].join("\n");
};

const answerReceivables = (
  question: string,
  data: FinanceBotData,
  overdueOnly = false,
) => {
  const openReceivables = data.receivables.filter(
    (receivable) => receivable.status !== "collected",
  );
  const overdue = openReceivables.filter(
    (receivable) => receivable.dueDate < data.today,
  );
  const selected = overdueOnly ? overdue : openReceivables;
  const total = sumAmounts(selected, (receivable) => receivable.amount);
  const wantsPriority = includesAny(question, [
    "first",
    "priority",
    "urgent",
    "unahin",
    "collect",
    "singilin",
  ]);

  if (selected.length === 0) {
    return overdueOnly
      ? `There are no overdue receivables for ${data.scopeLabel}.`
      : `There are no open receivables for ${data.scopeLabel}.`;
  }

  const rows = [...selected]
    .sort((left, right) => {
      const leftOverdue = left.dueDate < data.today ? 0 : 1;
      const rightOverdue = right.dueDate < data.today ? 0 : 1;
      return (
        leftOverdue - rightOverdue ||
        left.dueDate.localeCompare(right.dueDate) ||
        right.amount - left.amount
      );
    })
    .slice(0, 7)
    .map(
      (receivable) =>
        `${receivable.payer} — ${formatPeso(receivable.amount)}, due ${formatDate(receivable.dueDate)}${receivable.dueDate < data.today ? " (overdue)" : ""}`,
    );

  return [
    `${overdueOnly ? "Overdue" : "Open"} receivables for ${data.scopeLabel}: ${selected.length}, totaling ${formatPeso(total)}.`,
    wantsPriority
      ? "Recommended collection order: overdue claims first, then earliest due date and largest amount."
      : `Overdue within this list: ${overdue.length}.`,
    bulletList(rows),
  ].join("\n");
};

const answerMissingReceipts = (data: FinanceBotData) => {
  const missing = data.transactions.filter(
    (transaction) =>
      transaction.type === "cash_out" &&
      transaction.status !== "rejected" &&
      !transaction.receiptPath,
  );
  const total = sumAmounts(missing, (transaction) => transaction.amount);
  if (missing.length === 0) {
    return `No cash-out transactions are missing receipts for ${data.scopeLabel}.`;
  }

  const rows = [...missing]
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 8)
    .map(
      (transaction) =>
        `${formatDate(transaction.txnDate)} — ${transaction.purpose}: ${formatPeso(transaction.amount)} (${transaction.status})`,
    );

  return [
    `${missing.length} cash-out transaction${missing.length === 1 ? " is" : "s are"} missing receipts, totaling ${formatPeso(total)}.`,
    "Largest unsupported entries:",
    bulletList(rows),
  ].join("\n");
};

const answerExpenses = (question: string, data: FinanceBotData) => {
  const period = getPeriod(question, data);
  const expenses = data.transactions.filter(
    (transaction) =>
      isPosted(transaction) &&
      transaction.type === "cash_out" &&
      period.matches(transaction),
  );
  if (expenses.length === 0) {
    return `No posted cash-out transactions were found for ${data.scopeLabel}, ${period.label}.`;
  }

  const byCategory = new Map<string, number>();
  expenses.forEach((transaction) => {
    const category =
      data.categoryById.get(transaction.categoryId)?.name ||
      "Uncategorized";
    byCategory.set(
      category,
      (byCategory.get(category) || 0) + transaction.amount,
    );
  });
  const categoryRows = [...byCategory.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([category, amount]) => `${category}: ${formatPeso(amount)}`);
  const largestRows = [...expenses]
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5)
    .map(
      (transaction) =>
        `${transaction.purpose}: ${formatPeso(transaction.amount)} on ${formatDate(transaction.txnDate)}`,
    );

  return [
    `Posted expenses for ${data.scopeLabel}, ${period.label}: ${formatPeso(sumAmounts(expenses, (transaction) => transaction.amount))}.`,
    "",
    "Top categories:",
    bulletList(categoryRows),
    "",
    "Largest transactions:",
    bulletList(largestRows),
  ].join("\n");
};

const answerBudget = (data: FinanceBotData) => {
  if (data.budgets.length === 0) {
    return `No budget allocations are configured for ${data.scopeLabel} in ${data.monthKey}.`;
  }

  const monthExpenses = data.transactions.filter(
    (transaction) =>
      isPosted(transaction) &&
      transaction.type === "cash_out" &&
      transaction.txnDate.startsWith(data.monthKey),
  );
  const actualByCategory = new Map<string, number>();
  monthExpenses.forEach((transaction) => {
    actualByCategory.set(
      transaction.categoryId,
      (actualByCategory.get(transaction.categoryId) || 0) +
        transaction.amount,
    );
  });

  const rows = data.budgets
    .map((budget) => {
      const actual = actualByCategory.get(budget.categoryId) || 0;
      const remaining = budget.plannedAmount - actual;
      return {
        category:
          data.categoryById.get(budget.categoryId)?.name || "Uncategorized",
        planned: budget.plannedAmount,
        actual,
        remaining,
      };
    })
    .sort((left, right) => left.remaining - right.remaining);
  const planned = sumAmounts(rows, (row) => row.planned);
  const actual = sumAmounts(rows, (row) => row.actual);
  const overBudget = rows.filter((row) => row.remaining < 0);

  return [
    `Budget health for ${data.scopeLabel}, ${data.monthKey}:`,
    bulletList([
      `Planned: ${formatPeso(planned)}`,
      `Actual posted expenses: ${formatPeso(actual)}`,
      `Remaining: ${formatPeso(planned - actual)}`,
      `Over-budget categories: ${overBudget.length}`,
    ]),
    "",
    bulletList(
      rows
        .slice(0, 6)
        .map(
          (row) =>
            `${row.category}: ${formatPeso(row.actual)} of ${formatPeso(row.planned)}${row.remaining < 0 ? ` — over by ${formatPeso(Math.abs(row.remaining))}` : ""}`,
        ),
    ),
  ].join("\n");
};

const answerRecentTransactions = (data: FinanceBotData) => {
  const rows = [...data.transactions]
    .sort(
      (left, right) =>
        right.txnDate.localeCompare(left.txnDate) ||
        right.createdAt.localeCompare(left.createdAt),
    )
    .slice(0, 8);
  if (rows.length === 0) {
    return `No transactions are recorded for ${data.scopeLabel}.`;
  }
  return [
    `Latest transactions for ${data.scopeLabel}:`,
    bulletList(
      rows.map(
        (transaction) =>
          `${formatDate(transaction.txnDate)} — ${transaction.type === "cash_in" ? "Cash in" : "Cash out"} ${formatPeso(transaction.amount)} for ${transaction.purpose} (${transaction.status})`,
      ),
    ),
  ].join("\n");
};

const answerRisks = (data: FinanceBotData) => {
  const negativeAccounts = data.accounts.filter(
    (account) => account.isActive && account.currentBalance < 0,
  );
  const overduePayables = data.payables.filter(
    (payable) => payable.status !== "paid" && payable.dueDate < data.today,
  );
  const overdueReceivables = data.receivables.filter(
    (receivable) =>
      receivable.status !== "collected" && receivable.dueDate < data.today,
  );
  const missingReceipts = data.transactions.filter(
    (transaction) =>
      transaction.type === "cash_out" &&
      transaction.status !== "rejected" &&
      !transaction.receiptPath,
  );
  const pendingTransactions = data.transactions.filter(
    (transaction) => transaction.status === "pending",
  );

  const alerts = [
    negativeAccounts.length > 0
      ? `${negativeAccounts.length} active account${negativeAccounts.length === 1 ? " has" : "s have"} a negative balance.`
      : "",
    overduePayables.length > 0
      ? `${overduePayables.length} overdue payable${overduePayables.length === 1 ? "" : "s"} totaling ${formatPeso(sumAmounts(overduePayables, (item) => item.amount))}.`
      : "",
    overdueReceivables.length > 0
      ? `${overdueReceivables.length} overdue receivable${overdueReceivables.length === 1 ? "" : "s"} totaling ${formatPeso(sumAmounts(overdueReceivables, (item) => item.amount))}.`
      : "",
    missingReceipts.length > 0
      ? `${missingReceipts.length} cash-out transaction${missingReceipts.length === 1 ? " is" : "s are"} missing receipt support.`
      : "",
    pendingTransactions.length > 0
      ? `${pendingTransactions.length} transaction${pendingTransactions.length === 1 ? " is" : "s are"} still waiting for approval.`
      : "",
  ].filter(Boolean);

  if (alerts.length === 0) {
    return `No immediate rule-based finance risks were detected for ${data.scopeLabel}.`;
  }

  return [
    `Finance risk check for ${data.scopeLabel}:`,
    bulletList(alerts),
    "",
    "Recommended action: clear overdue collections and approvals first, then resolve unsupported expenses and negative account balances.",
  ].join("\n");
};

const answerSummary = (question: string, data: FinanceBotData) => {
  const periodQuestion = includesAny(question, [
    "today",
    "ngayon",
    "araw na ito",
  ])
    ? question
    : `${question} this month`;
  const period = getPeriod(periodQuestion, data);
  const transactions = data.transactions.filter(
    (transaction) => period.matches(transaction),
  );
  const posted = transactions.filter(isPosted);
  const cashIn = sumAmounts(
    posted.filter((transaction) => transaction.type === "cash_in"),
    (transaction) => transaction.amount,
  );
  const cashOut = sumAmounts(
    posted.filter((transaction) => transaction.type === "cash_out"),
    (transaction) => transaction.amount,
  );
  const pending = transactions.filter(
    (transaction) => transaction.status === "pending",
  );
  const openPayables = data.payables.filter(
    (payable) => payable.status !== "paid",
  );
  const openReceivables = data.receivables.filter(
    (receivable) => receivable.status !== "collected",
  );
  const totalLiquidity = sumAmounts(
    data.accounts.filter((account) => account.isActive),
    (account) => account.currentBalance,
  );

  return [
    `Finance summary for ${data.scopeLabel}, ${period.label}:`,
    bulletList([
      `Cash in: ${formatPeso(cashIn)}`,
      `Cash out: ${formatPeso(cashOut)}`,
      `Net cash movement: ${formatPeso(cashIn - cashOut)}`,
      `Pending approvals in period: ${pending.length}`,
      `Current liquidity: ${formatPeso(totalLiquidity)}`,
      `Open AP: ${formatPeso(sumAmounts(openPayables, (item) => item.amount))}`,
      `Open AR: ${formatPeso(sumAmounts(openReceivables, (item) => item.amount))}`,
    ]),
  ].join("\n");
};

export async function answerFinanceQuestion({
  userId,
  companyId,
  question,
}: FinanceBotRequest): Promise<string> {
  const normalized = normalizeQuestion(question);
  const data = loadFinanceBotData(userId, companyId);

  if (
    includesAny(normalized, [
      "help",
      "what can you do",
      "ano kaya mo",
      "commands",
      "capabilities",
    ])
  ) {
    return answerHelp();
  }
  if (
    includesAny(normalized, [
      "missing receipt",
      "missing receipts",
      "walang receipt",
      "kulang receipt",
      "unsupported expense",
    ])
  ) {
    return answerMissingReceipts(data);
  }
  if (
    includesAny(normalized, [
      "approval",
      "approvals",
      "for approval",
      "pending queue",
      "pending transaction",
    ])
  ) {
    return answerPendingApprovals(data);
  }
  if (
    includesAny(normalized, [
      "overdue payable",
      "overdue payables",
      "payable is overdue",
      "payables are overdue",
      "late payable",
      "late payment",
      "overdue ap",
      "bayaring overdue",
    ])
  ) {
    return answerPayables(normalized, data, true);
  }
  if (
    includesAny(normalized, [
      "collect first",
      "collection priority",
      "what should i collect",
      "who should i collect",
      "sino ang sisingilin",
      "ano ang sisingilin",
      "unahin singilin",
    ])
  ) {
    return answerReceivables(normalized, data);
  }
  if (
    includesAny(normalized, [
      "overdue receivable",
      "overdue receivables",
      "receivable is overdue",
      "receivables are overdue",
      "overdue ar",
      "late collection",
    ])
  ) {
    return answerReceivables(normalized, data, true);
  }
  if (
    includesAny(normalized, [
      "cash balance",
      "account balance",
      "bank balance",
      "e-wallet",
      "ewallet",
      "liquidity",
      "total cash",
      "cash available",
      "available cash",
      "magkano cash",
      "magkano ang pera",
      "saldo",
    ])
  ) {
    return answerCashPosition(data);
  }
  if (
    includesAny(normalized, [
      "profit",
      "net income",
      "kita",
      "tubo",
      "income result",
    ])
  ) {
    return answerProfit(normalized, data);
  }
  if (
    includesAny(normalized, [
      "cash flow",
      "cash in",
      "cash out",
      "net cash",
      "money flow",
      "income and expense",
      "pasok at labas",
    ])
  ) {
    return answerCashFlow(normalized, data);
  }
  if (
    includesAny(normalized, [
      "top expense",
      "top expenses",
      "biggest expense",
      "largest expense",
      "spending",
      "gastos",
      "saan napunta",
    ])
  ) {
    return answerExpenses(normalized, data);
  }
  if (includesAny(normalized, ["budget", "variance", "over budget"])) {
    return answerBudget(data);
  }
  if (
    includesAny(normalized, [
      "risk",
      "risks",
      "money leak",
      "leak",
      "tagas",
      "anomaly",
      "problem",
      "problema",
      "warning",
    ])
  ) {
    return answerRisks(data);
  }
  if (
    includesAny(normalized, [
      "recent transaction",
      "recent transactions",
      "latest transaction",
      "huling transaction",
    ])
  ) {
    return answerRecentTransactions(data);
  }
  if (
    includesAny(normalized, [
      "payable",
      "payables",
      "accounts payable",
      "open ap",
      "bayarin",
      "utang natin",
    ])
  ) {
    return answerPayables(normalized, data);
  }
  if (
    includesAny(normalized, [
      "receivable",
      "receivables",
      "accounts receivable",
      "open ar",
      "collection",
      "singilin",
      "utang sa atin",
    ])
  ) {
    return answerReceivables(normalized, data);
  }
  if (
    includesAny(normalized, [
      "summary",
      "summarize",
      "overview",
      "buod",
      "today",
      "ngayon",
      "how are we doing",
    ])
  ) {
    return answerSummary(normalized, data);
  }
  if (
    includesAny(normalized, [
      "hello",
      "hi",
      "hey",
      "good morning",
      "good afternoon",
      "kumusta",
    ])
  ) {
    return "Hello! I am the Herrera Finance Bot. Ask me about cash, approvals, AP/AR, receipts, budgets, expenses, or finance risks. Type “help” to see examples.";
  }

  return [
    "I could not match that question to a supported finance check yet.",
    "",
    "Try asking about cash balance, cash flow, pending approvals, overdue AP, collection priorities, missing receipts, budget health, top expenses, recent transactions, or risks.",
  ].join("\n");
}
