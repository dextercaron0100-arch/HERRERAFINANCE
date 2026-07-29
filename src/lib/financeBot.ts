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
  Company,
  FundTransfer,
  Payable,
  Receivable,
  Transaction,
} from "../types";

export type FinanceBotIntent =
  | "help"
  | "missing_receipts"
  | "approvals"
  | "overdue_payables"
  | "collection_priority"
  | "overdue_receivables"
  | "cash_position"
  | "profit"
  | "cash_flow"
  | "expenses"
  | "budget"
  | "risks"
  | "recent_transactions"
  | "payables"
  | "receivables"
  | "summary"
  | "greeting"
  | "unknown";

export type FinanceBotPeriod =
  | "today"
  | "this_month"
  | "last_month"
  | "all"
  | `month:${string}`;

export interface FinanceBotContext {
  intent?: FinanceBotIntent;
  companyId?: string;
  companyName?: string;
  period?: FinanceBotPeriod;
}

export interface FinanceBotEvidence {
  scope: string;
  period?: string;
  method: string;
  records: string[];
  calculatedAt: string;
}

export interface FinanceBotResponse {
  content: string;
  context: FinanceBotContext;
  evidence: FinanceBotEvidence;
}

interface FinanceBotRequest {
  userId: string;
  companyId: string;
  question: string;
  context?: FinanceBotContext;
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

const editDistance = (left: string, right: string) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
};

const wordsAreClose = (candidate: string, expected: string) => {
  if (candidate === expected) return true;
  if (expected.length < 5 || Math.abs(candidate.length - expected.length) > 2) {
    return false;
  }
  return editDistance(candidate, expected) <= (expected.length >= 9 ? 2 : 1);
};

const phraseMatches = (question: string, phrase: string) => {
  const normalizedPhrase = normalizeQuestion(phrase);
  const questionWords = question.split(" ");
  const phraseWords = normalizedPhrase.split(" ");
  if (
    phraseWords.length > 1
      ? question.includes(normalizedPhrase)
      : questionWords.includes(normalizedPhrase)
  ) {
    return true;
  }
  if (questionWords.length < phraseWords.length) return false;

  for (
    let startIndex = 0;
    startIndex <= questionWords.length - phraseWords.length;
    startIndex += 1
  ) {
    const matches = phraseWords.every((word, phraseIndex) =>
      wordsAreClose(questionWords[startIndex + phraseIndex], word),
    );
    if (matches) return true;
  }
  return false;
};

const includesAny = (question: string, phrases: string[]) =>
  phrases.some((phrase) => phraseMatches(question, phrase));

const sumAmounts = <T>(
  items: T[],
  amountSelector: (item: T) => number,
) => items.reduce((total, item) => total + amountSelector(item), 0);

const isPosted = (transaction: Transaction) =>
  transaction.status === "approved" || transaction.status === "completed";

const bulletList = (items: string[]) => items.map((item) => `• ${item}`).join("\n");

const ALL_COMPANY_PHRASES = [
  "all companies",
  "all company",
  "consolidated",
  "overall",
  "lahat ng company",
  "lahat ng kumpanya",
  "buong group",
];

const COMPANY_GENERIC_WORDS = new Set([
  "and",
  "building",
  "company",
  "corp",
  "corporation",
  "group",
  "herrera",
  "inc",
  "the",
]);

const findMentionedCompany = (
  userId: string,
  question: string,
): Company | undefined => {
  const accessibleCompanies = getCompanies().filter((company) =>
    canAccessCompany(userId, company.id),
  );
  const questionWords = question.split(" ");

  const exactMatch = accessibleCompanies.find((company) => {
    const companyName = normalizeQuestion(company.name);
    const companyCode = normalizeQuestion(company.code);
    return (
      question.includes(companyName) ||
      (companyCode.length >= 2 &&
        questionWords.some((word) => word === companyCode))
    );
  });
  if (exactMatch) return exactMatch;

  const tokenOwners = new Map<string, Set<string>>();
  accessibleCompanies.forEach((company) => {
    normalizeQuestion(company.name)
      .split(" ")
      .filter((word) => word.length >= 5 && !COMPANY_GENERIC_WORDS.has(word))
      .forEach((word) => {
        const owners = tokenOwners.get(word) || new Set<string>();
        owners.add(company.id);
        tokenOwners.set(word, owners);
      });
  });

  return accessibleCompanies.find((company) =>
    normalizeQuestion(company.name)
      .split(" ")
      .filter(
        (word) =>
          word.length >= 5 &&
          !COMPANY_GENERIC_WORDS.has(word) &&
          tokenOwners.get(word)?.size === 1,
      )
      .some((companyWord) =>
        questionWords.some((questionWord) =>
          wordsAreClose(questionWord, companyWord),
        ),
      ),
  );
};

const resolveCompanyScope = (
  userId: string,
  selectedCompanyId: string,
  question: string,
  context?: FinanceBotContext,
) => {
  if (includesAny(question, ALL_COMPANY_PHRASES)) {
    return { companyId: "all", companyName: "All accessible companies" };
  }

  const mentionedCompany = findMentionedCompany(userId, question);
  if (mentionedCompany) {
    return {
      companyId: mentionedCompany.id,
      companyName: mentionedCompany.name,
    };
  }

  if (
    context?.companyId &&
    (context.companyId === "all" ||
      canAccessCompany(userId, context.companyId))
  ) {
    return {
      companyId: context.companyId,
      companyName: context.companyName,
    };
  }

  const selectedCompany = getCompanies().find(
    (company) => company.id === selectedCompanyId,
  );
  return {
    companyId: selectedCompanyId,
    companyName:
      selectedCompanyId === "all"
        ? "All accessible companies"
        : selectedCompany?.name,
  };
};

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

const MONTH_NAMES = [
  ["january", "jan", "enero"],
  ["february", "feb", "pebrero"],
  ["march", "mar", "marso"],
  ["april", "apr", "abril"],
  ["mayo"],
  ["june", "jun", "hunyo"],
  ["july", "jul", "hulyo"],
  ["august", "aug", "agosto"],
  ["september", "sep", "sept", "setyembre"],
  ["october", "oct", "oktubre"],
  ["november", "nov", "nobyembre"],
  ["december", "dec", "disyembre"],
] as const;

const previousMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
};

const formatMonthKey = (monthKey: string) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(`${monthKey}-01T00:00:00+08:00`));

const findExplicitMonth = (question: string, currentMonthKey: string) => {
  const numericMonth = question.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])\b/);
  if (numericMonth) {
    return `${numericMonth[1]}-${numericMonth[2].padStart(2, "0")}`;
  }

  const monthIndex = MONTH_NAMES.findIndex((aliases) =>
    aliases.some((alias) => phraseMatches(question, alias)),
  );
  if (monthIndex === -1) return undefined;

  const explicitYear = question.match(/\b(20\d{2})\b/)?.[1];
  const currentYear = Number(currentMonthKey.slice(0, 4));
  return `${explicitYear || currentYear}-${String(monthIndex + 1).padStart(2, "0")}`;
};

const getPeriod = (
  question: string,
  data: FinanceBotData,
  fallback: FinanceBotPeriod = "all",
) => {
  if (includesAny(question, ["today", "ngayon", "araw na ito"])) {
    return {
      kind: "today" as const,
      label: "today",
      matches: (transaction: Transaction) =>
        transaction.txnDate === data.today,
    };
  }
  if (
    includesAny(question, [
      "last month",
      "previous month",
      "nakaraang buwan",
      "last na buwan",
    ])
  ) {
    const monthKey = previousMonthKey(data.monthKey);
    return {
      kind: "last_month" as const,
      label: formatMonthKey(monthKey),
      matches: (transaction: Transaction) =>
        transaction.txnDate.startsWith(monthKey),
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
      kind: "this_month" as const,
      label: "this month",
      matches: (transaction: Transaction) =>
        transaction.txnDate.startsWith(data.monthKey),
    };
  }

  const explicitMonth = findExplicitMonth(question, data.monthKey);
  if (explicitMonth) {
    return {
      kind: `month:${explicitMonth}` as const,
      label: formatMonthKey(explicitMonth),
      matches: (transaction: Transaction) =>
        transaction.txnDate.startsWith(explicitMonth),
    };
  }

  if (fallback === "today") {
    return {
      kind: "today" as const,
      label: "today",
      matches: (transaction: Transaction) =>
        transaction.txnDate === data.today,
    };
  }
  if (fallback === "this_month") {
    return {
      kind: "this_month" as const,
      label: "this month",
      matches: (transaction: Transaction) =>
        transaction.txnDate.startsWith(data.monthKey),
    };
  }
  if (fallback === "last_month") {
    const monthKey = previousMonthKey(data.monthKey);
    return {
      kind: "last_month" as const,
      label: formatMonthKey(monthKey),
      matches: (transaction: Transaction) =>
        transaction.txnDate.startsWith(monthKey),
    };
  }
  if (fallback.startsWith("month:")) {
    const monthKey = fallback.slice("month:".length);
    return {
      kind: fallback,
      label: formatMonthKey(monthKey),
      matches: (transaction: Transaction) =>
        transaction.txnDate.startsWith(monthKey),
    };
  }

  return {
    kind: "all" as const,
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

  const accountsByCompany = new Map<string, CashAccount[]>();
  activeAccounts.forEach((account) => {
    const companyAccounts = accountsByCompany.get(account.companyId) || [];
    companyAccounts.push(account);
    accountsByCompany.set(account.companyId, companyAccounts);
  });

  const companySections = [...accountsByCompany.entries()]
    .map(([companyId, accounts]) => ({
      company: data.companyById.get(companyId) || companyId,
      total: sumAmounts(accounts, (account) => account.currentBalance),
      accounts: [...accounts].sort(
        (left, right) => right.currentBalance - left.currentBalance,
      ),
    }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 8)
    .map(({ company, total: companyTotal, accounts }) =>
      [
        `• ${company}: ${formatPeso(companyTotal)} total`,
        ...accounts.map(
          (account) =>
            `  ↳ ${account.accountType} — ${account.accountName}: ${formatPeso(account.currentBalance)}`,
        ),
      ].join("\n"),
    );

  return [
    `Current liquidity for ${data.scopeLabel}: ${formatPeso(total)} across ${activeAccounts.length} active account${activeAccounts.length === 1 ? "" : "s"}.`,
    "",
    bulletList(
      [...byType.entries()].map(
        ([type, amount]) => `${type}: ${formatPeso(amount)}`,
      ),
    ),
    "",
    "Balances grouped by company:",
    companySections.join("\n"),
    "",
    "Each company total is shown once; its Bank, Cash on Hand, and E-Wallet balances are listed underneath.",
  ].join("\n");
};

const answerCashFlow = (
  question: string,
  data: FinanceBotData,
  periodFallback: FinanceBotPeriod = "all",
) => {
  const period = getPeriod(question, data, periodFallback);
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

const answerProfit = (
  question: string,
  data: FinanceBotData,
  periodFallback: FinanceBotPeriod = "this_month",
) => {
  const period = getPeriod(question, data, periodFallback);
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

const answerExpenses = (
  question: string,
  data: FinanceBotData,
  periodFallback: FinanceBotPeriod = "all",
) => {
  const period = getPeriod(question, data, periodFallback);
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

const answerSummary = (
  question: string,
  data: FinanceBotData,
  periodFallback: FinanceBotPeriod = "this_month",
) => {
  const period = getPeriod(question, data, periodFallback);
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

const detectIntent = (question: string): FinanceBotIntent => {
  if (
    includesAny(question, [
      "help",
      "what can you do",
      "ano kaya mo",
      "commands",
      "capabilities",
    ])
  ) {
    return "help";
  }
  if (
    includesAny(question, [
      "missing receipt",
      "missing receipts",
      "walang receipt",
      "kulang receipt",
      "unsupported expense",
    ])
  ) {
    return "missing_receipts";
  }
  if (
    includesAny(question, [
      "approval",
      "approvals",
      "for approval",
      "pending queue",
      "pending transaction",
    ])
  ) {
    return "approvals";
  }
  if (
    includesAny(question, [
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
    return "overdue_payables";
  }
  if (
    includesAny(question, [
      "collect first",
      "collection priority",
      "what should i collect",
      "who should i collect",
      "sino ang sisingilin",
      "ano ang sisingilin",
      "unahin singilin",
    ])
  ) {
    return "collection_priority";
  }
  if (
    includesAny(question, [
      "overdue receivable",
      "overdue receivables",
      "receivable is overdue",
      "receivables are overdue",
      "overdue ar",
      "late collection",
    ])
  ) {
    return "overdue_receivables";
  }
  if (
    includesAny(question, [
      "cash balance",
      "cash position",
      "balance breakdown",
      "account balance",
      "bank balance",
      "e-wallet",
      "ewallet",
      "liquidity",
      "total cash",
      "cash available",
      "available cash",
      "how much cash",
      "how much money",
      "magkano cash",
      "magkano pera",
      "magkano ang pera",
      "saldo",
    ])
  ) {
    return "cash_position";
  }
  if (
    includesAny(question, [
      "profit",
      "net income",
      "kita",
      "tubo",
      "income result",
    ])
  ) {
    return "profit";
  }
  if (
    includesAny(question, [
      "cash flow",
      "cash in",
      "cash out",
      "net cash",
      "money flow",
      "income and expense",
      "pasok at labas",
    ])
  ) {
    return "cash_flow";
  }
  if (
    includesAny(question, [
      "top expense",
      "top expenses",
      "biggest expense",
      "largest expense",
      "spending",
      "gastos",
      "saan napunta",
    ])
  ) {
    return "expenses";
  }
  if (includesAny(question, ["budget", "variance", "over budget"])) {
    return "budget";
  }
  if (
    includesAny(question, [
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
    return "risks";
  }
  if (
    includesAny(question, [
      "recent transaction",
      "recent transactions",
      "latest transaction",
      "huling transaction",
    ])
  ) {
    return "recent_transactions";
  }
  if (
    includesAny(question, [
      "payable",
      "payables",
      "accounts payable",
      "open ap",
      "bayarin",
      "utang natin",
    ])
  ) {
    return "payables";
  }
  if (
    includesAny(question, [
      "receivable",
      "receivables",
      "accounts receivable",
      "open ar",
      "collection",
      "singilin",
      "utang sa atin",
    ])
  ) {
    return "receivables";
  }
  if (
    includesAny(question, [
      "summary",
      "summarize",
      "overview",
      "buod",
      "today",
      "ngayon",
      "how are we doing",
    ])
  ) {
    return "summary";
  }
  if (
    includesAny(question, [
      "hello",
      "hi",
      "hey",
      "good morning",
      "good afternoon",
      "kumusta",
    ])
  ) {
    return "greeting";
  }
  return "unknown";
};

const hasExplicitPeriod = (question: string, data: FinanceBotData) =>
  includesAny(question, [
    "today",
    "ngayon",
    "araw na ito",
    "this month",
    "current month",
    "last month",
    "previous month",
    "nakaraang buwan",
  ]) || Boolean(findExplicitMonth(question, data.monthKey));

const isContextualFollowUp = (
  question: string,
  userId: string,
  data: FinanceBotData,
) =>
  includesAny(question, [
    "how about",
    "what about",
    "paano naman",
    "kamusta naman",
    "naman",
    "same for",
    "breakdown",
  ]) ||
  Boolean(findMentionedCompany(userId, question)) ||
  hasExplicitPeriod(question, data);

const PERIOD_INTENTS = new Set<FinanceBotIntent>([
  "cash_flow",
  "expenses",
  "profit",
  "summary",
]);

const defaultPeriodForIntent = (intent: FinanceBotIntent): FinanceBotPeriod =>
  intent === "profit" || intent === "summary" ? "this_month" : "all";

const answerForIntent = (
  intent: FinanceBotIntent,
  question: string,
  data: FinanceBotData,
  period: FinanceBotPeriod,
) => {
  switch (intent) {
    case "help":
      return answerHelp();
    case "missing_receipts":
      return answerMissingReceipts(data);
    case "approvals":
      return answerPendingApprovals(data);
    case "overdue_payables":
      return answerPayables(question, data, true);
    case "collection_priority":
      return answerReceivables(question, data);
    case "overdue_receivables":
      return answerReceivables(question, data, true);
    case "cash_position":
      return answerCashPosition(data);
    case "profit":
      return answerProfit(question, data, period);
    case "cash_flow":
      return answerCashFlow(question, data, period);
    case "expenses":
      return answerExpenses(question, data, period);
    case "budget":
      return answerBudget(data);
    case "risks":
      return answerRisks(data);
    case "recent_transactions":
      return answerRecentTransactions(data);
    case "payables":
      return answerPayables(question, data);
    case "receivables":
      return answerReceivables(question, data);
    case "summary":
      return answerSummary(question, data, period);
    case "greeting":
      return "Hello! I am the Herrera Finance Bot. Ask me about cash, approvals, AP/AR, receipts, budgets, expenses, or finance risks. Type “help” to see examples.";
    default:
      return [
        "I could not match that question to a supported finance check yet.",
        "",
        "Try asking about cash balance, cash flow, pending approvals, overdue AP, collection priorities, missing receipts, budget health, top expenses, recent transactions, or risks.",
      ].join("\n");
  }
};

const evidenceMethodByIntent: Record<FinanceBotIntent, string> = {
  help: "Shows the locally supported finance checks.",
  missing_receipts:
    "Filters non-rejected cash-out entries without an attached receipt, then totals their amounts.",
  approvals:
    "Counts pending transactions and pending fund transfers, then totals each queue.",
  overdue_payables:
    "Filters unpaid AP records with due dates before today and orders them by due date, then amount.",
  collection_priority:
    "Orders open AR records by overdue status, due date, and amount.",
  overdue_receivables:
    "Filters uncollected AR records with due dates before today and totals them.",
  cash_position:
    "Sums current balances of active accounts, then groups them by company and account type.",
  profit:
    "Subtracts posted cash-out entries from posted cash-in entries. This is a cash-basis estimate, not accrual profit.",
  cash_flow:
    "Totals posted cash-in and cash-out entries for the selected period and calculates the net movement.",
  expenses:
    "Filters posted cash-out entries for the selected period and groups them by category.",
  budget:
    "Compares this month's planned category budgets against posted cash-out entries.",
  risks:
    "Applies deterministic checks for negative balances, overdue AP/AR, missing receipts, and pending approvals.",
  recent_transactions:
    "Orders permitted transactions by transaction date and creation time.",
  payables: "Filters AP records that are not marked paid and totals them.",
  receivables:
    "Filters AR records that are not marked collected and totals them.",
  summary:
    "Combines posted period cash flow with current liquidity, open AP/AR, and pending approvals.",
  greeting: "No financial records were calculated for this greeting.",
  unknown: "No calculation was run because the question did not match a supported finance check.",
};

const buildEvidence = (
  intent: FinanceBotIntent,
  data: FinanceBotData,
  period: FinanceBotPeriod,
  question: string,
): FinanceBotEvidence => {
  const recordsByIntent: Partial<Record<FinanceBotIntent, string[]>> = {
    cash_position: [`${data.accounts.length} cash account records`],
    cash_flow: [`${data.transactions.length} transaction records`],
    profit: [`${data.transactions.length} transaction records`],
    expenses: [
      `${data.transactions.length} transaction records`,
      `${data.categoryById.size} category records`,
    ],
    summary: [
      `${data.transactions.length} transaction records`,
      `${data.accounts.length} cash account records`,
      `${data.payables.length} AP records`,
      `${data.receivables.length} AR records`,
    ],
    approvals: [
      `${data.transactions.length} transaction records`,
      `${data.transfers.length} fund-transfer records`,
    ],
    missing_receipts: [`${data.transactions.length} transaction records`],
    recent_transactions: [`${data.transactions.length} transaction records`],
    payables: [`${data.payables.length} AP records`],
    overdue_payables: [`${data.payables.length} AP records`],
    receivables: [`${data.receivables.length} AR records`],
    overdue_receivables: [`${data.receivables.length} AR records`],
    collection_priority: [`${data.receivables.length} AR records`],
    budget: [
      `${data.budgets.length} budget records`,
      `${data.transactions.length} transaction records`,
    ],
    risks: [
      `${data.accounts.length} cash account records`,
      `${data.transactions.length} transaction records`,
      `${data.payables.length} AP records`,
      `${data.receivables.length} AR records`,
    ],
  };
  const selectedPeriod = getPeriod(question, data, period);

  return {
    scope: data.scopeLabel,
    period: PERIOD_INTENTS.has(intent) ? selectedPeriod.label : undefined,
    method: evidenceMethodByIntent[intent],
    records: recordsByIntent[intent] || ["No finance records used"],
    calculatedAt: new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    }).format(new Date()),
  };
};

export async function answerFinanceQuestion({
  userId,
  companyId,
  question,
  context,
}: FinanceBotRequest): Promise<FinanceBotResponse> {
  const normalized = normalizeQuestion(question);
  const scope = resolveCompanyScope(userId, companyId, normalized, context);
  const data = loadFinanceBotData(userId, scope.companyId);
  const detectedIntent = detectIntent(normalized);
  const intent =
    detectedIntent === "unknown" &&
    context?.intent &&
    context.intent !== "unknown" &&
    isContextualFollowUp(normalized, userId, data)
      ? context.intent
      : detectedIntent;
  const periodFallback =
    context?.period || defaultPeriodForIntent(intent);
  const selectedPeriod = PERIOD_INTENTS.has(intent)
    ? getPeriod(normalized, data, periodFallback).kind
    : periodFallback;

  return {
    content: answerForIntent(intent, normalized, data, selectedPeriod),
    context: {
      intent:
        intent === "greeting" || intent === "help" || intent === "unknown"
          ? context?.intent
          : intent,
      companyId: scope.companyId,
      companyName: scope.companyName || data.scopeLabel,
      period: selectedPeriod,
    },
    evidence: buildEvidence(
      intent,
      data,
      selectedPeriod,
      normalized,
    ),
  };
}
