/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Company,
  Profile,
  UserCompanyRole,
  Category,
  Transaction,
  Approval,
  Budget,
  Payable,
  Receivable,
  Employee,
  PayrollRun,
  PayrollItem,
  AuditLog,
  CompanyRole,
  CashflowType,
  TransactionStatus,
  ApprovalAction,
  PayableStatus,
  ReceivableStatus,
  PayrollStatus,
  Deductions,
  DailyBalance
} from '../types';

// Storage keys
const DB_PREFIX = 'finance_db_';
const KEYS = {
  COMPANIES: `${DB_PREFIX}companies`,
  PROFILES: `${DB_PREFIX}profiles`,
  ROLES: `${DB_PREFIX}roles`,
  CATEGORIES: `${DB_PREFIX}categories`,
  TRANSACTIONS: `${DB_PREFIX}transactions`,
  APPROVALS: `${DB_PREFIX}approvals`,
  BUDGETS: `${DB_PREFIX}budgets`,
  PAYABLES: `${DB_PREFIX}payables`,
  RECEIVABLES: `${DB_PREFIX}receivables`,
  EMPLOYEES: `${DB_PREFIX}employees`,
  PAYROLL_RUNS: `${DB_PREFIX}payroll_runs`,
  PAYROLL_ITEMS: `${DB_PREFIX}payroll_items`,
  AUDIT_LOGS: `${DB_PREFIX}audit_logs`,
  CURRENT_USER_ID: `${DB_PREFIX}current_user_id`,
  SELECTED_COMPANY_ID: `${DB_PREFIX}selected_company_id`
};

// Seed lists
export const SEED_COMPANIES: Company[] = [
  { id: 'c-bls', name: 'Blesscent', code: 'BLS', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'c-bgs', name: 'Bigstop', code: 'BGS', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'c-frh', name: 'Franchise Hub', code: 'FRH', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'c-sct', name: 'Scentimo', code: 'SCT', createdAt: '2026-01-01T08:00:00Z' }
];

export const SEED_PROFILES: Profile[] = [
  { id: 'u-gadmin', fullName: 'Dexter Caron (Group Admin)', email: 'group.admin@example.com', isGroupAdmin: true, createdAt: '2026-01-01T08:00:00Z' },
  { id: 'u-blsadmin', fullName: 'Blesscent Admin', email: 'bls.admin@example.com', isGroupAdmin: false, createdAt: '2026-01-01T08:00:00Z' },
  { id: 'u-blsfinance', fullName: 'Blesscent Finance', email: 'bls.finance@example.com', isGroupAdmin: false, createdAt: '2026-01-01T08:00:00Z' },
  { id: 'u-blsapprover', fullName: 'Blesscent Approver', email: 'bls.approver@example.com', isGroupAdmin: false, createdAt: '2026-01-01T08:00:00Z' },
  { id: 'u-blsviewer', fullName: 'Blesscent Viewer', email: 'bls.viewer@example.com', isGroupAdmin: false, createdAt: '2026-01-01T08:00:00Z' }
];

export const SEED_ROLES: UserCompanyRole[] = [
  { userId: 'u-blsadmin', companyId: 'c-bls', role: 'company_admin', createdAt: '2026-01-01T08:00:00Z' },
  { userId: 'u-blsfinance', companyId: 'c-bls', role: 'finance_officer', createdAt: '2026-01-01T08:00:00Z' },
  { userId: 'u-blsapprover', companyId: 'c-bls', role: 'approver', createdAt: '2026-01-01T08:00:00Z' },
  { userId: 'u-blsviewer', companyId: 'c-bls', role: 'viewer', createdAt: '2026-01-01T08:00:00Z' }
];

export const DEFAULT_CASH_OUT_CATEGORIES = [
  'payroll',
  'operations',
  'utilities',
  'marketing',
  'supplies',
  'maintenance',
  'software',
  'rent',
  'subscriptions'
];

export const DEFAULT_CASH_IN_CATEGORIES = [
  'sales',
  'service_income',
  'collections',
  'deposits'
];

// Localstorage helper
const load = <T>(key: string, def: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : def;
};

const save = <T>(key: string, val: T): void => {
  localStorage.setItem(key, JSON.stringify(val));
};

// Initialize database
export function initDB() {
  if (!localStorage.getItem(KEYS.COMPANIES)) {
    save(KEYS.COMPANIES, SEED_COMPANIES);
    save(KEYS.PROFILES, SEED_PROFILES);
    save(KEYS.ROLES, SEED_ROLES);

    // Categories
    const categories: Category[] = [];
    let catIdCounter = 1;
    SEED_COMPANIES.forEach((c) => {
      DEFAULT_CASH_OUT_CATEGORIES.forEach((name) => {
        categories.push({
          id: `cat-out-${catIdCounter++}`,
          companyId: c.id,
          name,
          type: 'cash_out',
          createdAt: '2026-01-01T08:00:00Z'
        });
      });
      DEFAULT_CASH_IN_CATEGORIES.forEach((name) => {
        categories.push({
          id: `cat-in-${catIdCounter++}`,
          companyId: c.id,
          name,
          type: 'cash_in',
          createdAt: '2026-01-01T08:00:00Z'
        });
      });
    });
    save(KEYS.CATEGORIES, categories);

    // Initial Seed Transactions to make ledger and dashboards look spectacular right away
    const transactions: Transaction[] = [
      {
        id: 'txn-1',
        companyId: 'c-bls',
        txnDate: '2026-06-01',
        type: 'cash_in',
        amount: 250000.00,
        categoryId: 'cat-in-10', // sales
        purpose: 'Monthly Store Sales Retail',
        responsiblePerson: 'Ana Santos',
        receiptPath: null,
        status: 'approved',
        encodedBy: 'u-blsfinance',
        reversalOf: null,
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-01T10:00:00Z'
      },
      {
        id: 'txn-2',
        companyId: 'c-bls',
        txnDate: '2026-06-02',
        type: 'cash_out',
        amount: 45000.00,
        categoryId: 'cat-out-8', // rent
        purpose: 'Store Rent payment - June 2026',
        responsiblePerson: 'Landlord Corp',
        receiptPath: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=300',
        status: 'approved',
        encodedBy: 'u-blsfinance',
        reversalOf: null,
        createdAt: '2026-06-02T11:00:00Z',
        updatedAt: '2026-06-02T11:00:00Z'
      },
      {
        id: 'txn-3',
        companyId: 'c-bls',
        txnDate: '2026-06-05',
        type: 'cash_out',
        amount: 15320.50,
        categoryId: 'cat-out-3', // utilities
        purpose: 'Meralco Electric Bill Payment',
        responsiblePerson: 'Elena Rivera',
        receiptPath: null,
        status: 'approved',
        encodedBy: 'u-blsfinance',
        reversalOf: null,
        createdAt: '2026-06-05T14:30:00Z',
        updatedAt: '2026-06-05T14:30:00Z'
      },
      {
        id: 'txn-4',
        companyId: 'c-bls',
        txnDate: '2026-06-10',
        type: 'cash_out',
        amount: 8500.00,
        categoryId: 'cat-out-4', // marketing
        purpose: 'Facebook Ads campaign campaign launch',
        responsiblePerson: 'John Lim',
        receiptPath: null,
        status: 'approved',
        encodedBy: 'u-blsfinance',
        reversalOf: null,
        createdAt: '2026-06-10T09:00:00Z',
        updatedAt: '2026-06-10T09:00:00Z'
      },
      {
        id: 'txn-5',
        companyId: 'c-bls',
        txnDate: '2026-06-11',
        type: 'cash_out',
        amount: 12000.00,
        categoryId: 'cat-out-2', // operations
        purpose: 'Office supplies replenishment',
        responsiblePerson: 'Carlos Diaz',
        receiptPath: null,
        status: 'pending',
        encodedBy: 'u-blsfinance',
        reversalOf: null,
        createdAt: '2026-06-11T16:00:00Z',
        updatedAt: '2026-06-11T16:00:00Z'
      },
      {
        id: 'txn-6',
        companyId: 'c-bls',
        txnDate: '2026-06-12',
        type: 'cash_in',
        amount: 42000.00,
        categoryId: 'cat-in-11', // service_income
        purpose: 'Franchise setup consulting fees',
        responsiblePerson: 'Dexter Caron',
        receiptPath: null,
        status: 'pending',
        encodedBy: 'u-blsadmin',
        reversalOf: null,
        createdAt: '2026-06-12T10:00:00Z',
        updatedAt: '2026-06-12T10:00:00Z'
      },
      // Bigstop seed
      {
        id: 'txn-bgs-1',
        companyId: 'c-bgs',
        txnDate: '2026-06-03',
        type: 'cash_in',
        amount: 320000.00,
        categoryId: 'cat-in-23', // sales for BGS
        purpose: 'Convenience store franchise bulk sales',
        responsiblePerson: 'Danica Cruz',
        receiptPath: null,
        status: 'approved',
        encodedBy: 'u-gadmin',
        reversalOf: null,
        createdAt: '2026-06-03T10:00:00Z',
        updatedAt: '2026-06-03T10:00:00Z'
      },
      {
        id: 'txn-bgs-2',
        companyId: 'c-bgs',
        txnDate: '2026-06-08',
        type: 'cash_out',
        amount: 14000.00,
        categoryId: 'cat-out-12', // operations for BGS
        purpose: 'POS terminals annual maintenance',
        responsiblePerson: 'Tech Solutions Inc',
        receiptPath: null,
        status: 'approved',
        encodedBy: 'u-gadmin',
        reversalOf: null,
        createdAt: '2026-06-08T15:00:00Z',
        updatedAt: '2026-06-08T15:00:00Z'
      }
    ];
    save(KEYS.TRANSACTIONS, transactions);

    // Initial Budgets
    const budgets: Budget[] = [
      { id: 'b-1', companyId: 'c-bls', categoryId: 'cat-out-8', month: '2026-06-01', plannedAmount: 50000.00, createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-01T08:00:00Z' },
      { id: 'b-2', companyId: 'c-bls', categoryId: 'cat-out-3', month: '2026-06-01', plannedAmount: 20000.00, createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-01T08:00:00Z' },
      { id: 'b-3', companyId: 'c-bls', categoryId: 'cat-out-4', month: '2026-06-01', plannedAmount: 15000.00, createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-01T08:00:00Z' },
      { id: 'b-4', companyId: 'c-bls', categoryId: 'cat-out-5', month: '2026-06-01', plannedAmount: 5000.00, createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-01T08:00:00Z' }
    ];
    save(KEYS.BUDGETS, budgets);

    // Initial Payables
    const payables: Payable[] = [
      { id: 'p-1', companyId: 'c-bls', payee: 'PLDT Inc.', description: 'Fiber Internet Subscription May-June', amount: 3500.00, dueDate: '2026-06-18', status: 'unpaid', paidTransactionId: null, createdAt: '2026-06-01T11:00:00Z', updatedAt: '2026-06-01T11:00:00Z' },
      { id: 'p-2', companyId: 'c-bls', payee: 'Prime Office Depot', description: 'Office supplies order invoice #104', amount: 8900.00, dueDate: '2026-06-25', status: 'unpaid', paidTransactionId: null, createdAt: '2026-06-01T11:00:00Z', updatedAt: '2026-06-01T11:00:00Z' }
    ];
    save(KEYS.PAYABLES, payables);

    // Initial Receivables
    const receivables: Receivable[] = [
      { id: 'rec-1', companyId: 'c-bls', payer: 'Robinson Mall Group', description: 'Consignment rental sales distribution', amount: 165000.00, dueDate: '2026-06-20', status: 'uncollected', collectedTransactionId: null, createdAt: '2026-06-01T11:00:00Z', updatedAt: '2026-06-01T11:00:00Z' }
    ];
    save(KEYS.RECEIVABLES, receivables);

    // Employees
    const employees: Employee[] = [
      { id: 'e-1', companyId: 'c-bls', fullName: 'Juana Dela Cruz', position: 'Store Supervisor', baseSalary: 23500.00, active: true, createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-01T08:00:00Z' },
      { id: 'e-2', companyId: 'c-bls', fullName: 'Roberto Santos', position: 'Service Associate', baseSalary: 18000.00, active: true, createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-01T08:00:00Z' },
      { id: 'e-3', companyId: 'c-bls', fullName: 'Maria Alona', position: 'Administrative Staff', baseSalary: 20000.00, active: true, createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-01T08:00:00Z' }
    ];
    save(KEYS.EMPLOYEES, employees);

    // Audit logs
    const auditLogs: AuditLog[] = [
      {
        id: 'log-1',
        companyId: null,
        actorId: 'u-gadmin',
        action: 'DB_INITIALIZATION',
        entity: 'system',
        entityId: null,
        details: { message: 'Database initiated with complete seed structure & 4 companies' },
        createdAt: '2026-06-12T00:00:00Z'
      }
    ];
    save(KEYS.AUDIT_LOGS, auditLogs);

    // Default selectors
    save(KEYS.CURRENT_USER_ID, 'u-gadmin'); // default to Group Admin for full exposure initially
    save(KEYS.SELECTED_COMPANY_ID, 'c-bls');
  }
}

// Current selector state helpers
export function getCurrentUser(): Profile {
  initDB();
  const userId = load(KEYS.CURRENT_USER_ID, 'u-gadmin');
  const profiles = load<Profile[]>(KEYS.PROFILES, []);
  return profiles.find(p => p.id === userId) || profiles[0];
}

export function setCurrentUser(userId: string): void {
  save(KEYS.CURRENT_USER_ID, userId);
  // Auto switch selected company if user has no access to the current one
  const user = getProfiles().find(p => p.id === userId);
  if (user && !user.isGroupAdmin) {
    const roles = getRoles().filter(r => r.userId === userId);
    if (roles.length > 0) {
      save(KEYS.SELECTED_COMPANY_ID, roles[0].companyId);
    }
  }
}

export function getSelectedCompanyId(): string {
  return load(KEYS.SELECTED_COMPANY_ID, 'c-bls');
}

export function setSelectedCompanyId(companyId: string): void {
  save(KEYS.SELECTED_COMPANY_ID, companyId);
}

// REST GETTERS
export function getCompanies(): Company[] {
  initDB();
  return load<Company[]>(KEYS.COMPANIES, []);
}

export function getProfiles(): Profile[] {
  initDB();
  return load<Profile[]>(KEYS.PROFILES, []);
}

export function getRoles(): UserCompanyRole[] {
  initDB();
  return load<UserCompanyRole[]>(KEYS.ROLES, []);
}

export function getCategories(companyId: string): Category[] {
  initDB();
  const all = load<Category[]>(KEYS.CATEGORIES, []);
  return all.filter(c => c.companyId === companyId);
}

export function getAllCategories(): Category[] {
  initDB();
  return load<Category[]>(KEYS.CATEGORIES, []);
}

// Helper: check role of caller inside specific company
export function getUserRole(userId: string, companyId: string): CompanyRole | null {
  const user = getProfiles().find(p => p.id === userId);
  if (!user) return null;
  if (user.isGroupAdmin) return 'company_admin'; // Treat group admin as highest admin power
  const roleRecord = getRoles().find(r => r.userId === userId && r.companyId === companyId);
  return roleRecord ? roleRecord.role : null;
}

export function isGroupAdmin(userId: string): boolean {
  const user = getProfiles().find(p => p.id === userId);
  return !!(user && user.isGroupAdmin);
}

export function canAccessCompany(userId: string, companyId: string): boolean {
  return isGroupAdmin(userId) || getUserRole(userId, companyId) !== null;
}

export function canWriteFinance(userId: string, companyId: string): boolean {
  if (isGroupAdmin(userId)) return true;
  const role = getUserRole(userId, companyId);
  return role === 'company_admin' || role === 'finance_officer';
}

export function canAdminCompany(userId: string, companyId: string): boolean {
  if (isGroupAdmin(userId)) return true;
  const role = getUserRole(userId, companyId);
  return role === 'company_admin';
}

export function canManagePayroll(userId: string, companyId: string): boolean {
  return canAdminCompany(userId, companyId);
}

// Log audit action
export function writeAuditLog(
  actorId: string,
  companyId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  details: Record<string, any>
): void {
  const currentLogs = load<AuditLog[]>(KEYS.AUDIT_LOGS, []);
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    companyId,
    actorId,
    action,
    entity,
    entityId,
    details,
    createdAt: new Date().toISOString()
  };
  currentLogs.unshift(newLog); // Put at top
  save(KEYS.AUDIT_LOGS, currentLogs);
}

export function getAuditLogs(userId: string, companyId: string | null = null): AuditLog[] {
  const logs = load<AuditLog[]>(KEYS.AUDIT_LOGS, []);
  const user = getProfiles().find(p => p.id === userId);
  if (!user) return [];

  // Group Admin can see all
  if (user.isGroupAdmin) {
    if (companyId) return logs.filter(l => l.companyId === companyId);
    return logs;
  }

  // Company Admin can see their own company audit logs
  const roles = getRoles().filter(r => r.userId === userId && r.role === 'company_admin');
  const allowedCompanyIds = roles.map(r => r.companyId);

  return logs.filter(log => {
    if (!log.companyId) return false;
    return allowedCompanyIds.includes(log.companyId);
  });
}

// TRANSACTION READ/WRITE (WITH RLS CHECKS MOCKED)
export function getTransactions(userId: string, companyId: string | null = null): Transaction[] {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  if (!userId) return [];

  // Filter based on companies the user is allowed to access
  return allTxns.filter(t => {
    if (!canAccessCompany(userId, t.companyId)) return false;
    if (companyId && t.companyId !== companyId) return false;
    return true;
  });
}

// Encode new Transaction
export function insertTransaction(userId: string, data: Omit<Transaction, 'id' | 'status' | 'encodedBy' | 'createdAt' | 'updatedAt'>): { error?: string; transaction?: Transaction } {
  // Validate Security Write Privileges
  if (!canWriteFinance(userId, data.companyId)) {
    return { error: 'Security Enforcement: Insufficient privileges to encode financial transaction for this company.' };
  }

  // Validate Constraints & Category Match
  const categories = getCategories(data.companyId);
  const matchedCat = categories.find(c => c.id === data.categoryId);
  if (!matchedCat) {
    return { error: 'Database Constraint Error: Category does not exist or does not belong to target company.' };
  }
  if (matchedCat.type !== data.type) {
    return { error: 'Database Constraint Error: Cashflow type does not match of selected category.' };
  }
  if (data.amount <= 0) {
    return { error: 'Value range validation error: Financial amounts must be strictly positive.' };
  }

  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const newTxn: Transaction = {
    ...data,
    id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    status: 'pending',
    encodedBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  allTxns.unshift(newTxn);
  save(KEYS.TRANSACTIONS, allTxns);

  // Write audit trail
  writeAuditLog(
    userId,
    data.companyId,
    'ENCODE_TRANSACTION',
    'transaction',
    newTxn.id,
    { amount: data.amount, purpose: data.purpose }
  );

  return { transaction: newTxn };
}

// Create reversal correction
export function createReversalTransaction(userId: string, targetTxnId: string, currentCompanyId: string): { error?: string; transaction?: Transaction } {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const target = allTxns.find(t => t.id === targetTxnId);

  if (!target) {
    return { error: 'Transaction not found for reversal.' };
  }

  if (target.companyId !== currentCompanyId) {
    return { error: 'Security breach: Insufficient privileges across multi-tenant boundaries.' };
  }

  if (target.status !== 'approved') {
    return { error: 'Only fully approved, finalized transactions can be reversed.' };
  }

  // Ensure write permission
  if (!canWriteFinance(userId, target.companyId)) {
    return { error: 'Security Enforcement: Insufficient roles to perform adjustment reversals.' };
  }

  // Create reverse cashflow-type transaction
  const reversalType: CashflowType = target.type === 'cash_in' ? 'cash_out' : 'cash_in';
  
  // Find a generic reversal category or use same
  const newTxn: Transaction = {
    id: `txn-rev-${Date.now()}`,
    companyId: target.companyId,
    txnDate: new Date().toISOString().split('T')[0],
    type: reversalType,
    amount: target.amount,
    categoryId: target.categoryId, // Keep the category for accurate variance balancing
    purpose: `REVERSAL OF #${target.id}: Correction for: ${target.purpose}`,
    responsiblePerson: 'Financial Adjustment',
    receiptPath: null,
    status: 'pending', // Starts as pending approval
    encodedBy: userId,
    reversalOf: target.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  allTxns.unshift(newTxn);
  save(KEYS.TRANSACTIONS, allTxns);

  writeAuditLog(
    userId,
    target.companyId,
    'WRITE_REVERSAL_TXN',
    'transaction',
    newTxn.id,
    { targetTxnId, amount: target.amount }
  );

  return { transaction: newTxn };
}

// Reviewing Pending Transaction (RPC: review_transaction)
export function reviewTransaction(
  userId: string,
  targetTransactionId: string,
  reviewAction: ApprovalAction,
  reviewRemarks: string | null
): { error?: string; transaction?: Transaction } {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const index = allTxns.findIndex(t => t.id === targetTransactionId);

  if (index === -1) {
    return { error: 'Target transaction not found.' };
  }

  const txn = allTxns[index];

  // Rule: Caller must be approver, company_admin or group_admin
  const role = getUserRole(userId, txn.companyId);
  const isApprover = role === 'approver' || role === 'company_admin' || isGroupAdmin(userId);
  if (!isApprover) {
    return { error: 'Access Denied: Only authorized Approvers or Admins can review pending transactions.' };
  }

  // Rule: Cannot approve your own encoded transaction
  if (txn.encodedBy === userId) {
    return { error: 'Conflicts of Interest policy: You are strictly forbidden from approving your own encoded transactions.' };
  }

  // Rule: Threshold Approval - >10000 requires company_admin or group_admin
  if (txn.amount > 10000.00 && role === 'approver') {
    return { error: 'Limit Constraint: Transactions exceeding ₱10,000.00 require Company Administrator or Group Administrator approval.' };
  }

  // Rule: Rejection requires remarks
  if (reviewAction === 'rejected' && (!reviewRemarks || reviewRemarks.trim() === '')) {
    return { error: 'Review Policy: Rejection remarks are strictly mandatory to provide audited failure reasons.' };
  }

  // Rule: Only pending can be reviewed
  if (txn.status !== 'pending') {
    return { error: 'Action Blocked: This transaction has already been reviewed to a final state.' };
  }

  // Update
  txn.status = reviewAction === 'approved' ? 'approved' : 'rejected';
  txn.updatedAt = new Date().toISOString();
  allTxns[index] = txn;
  save(KEYS.TRANSACTIONS, allTxns);

  // Insert into approvals
  const approvals = load<Approval[]>(KEYS.APPROVALS, []);
  const newApproval: Approval = {
    id: `app-${Date.now()}`,
    transactionId: targetTransactionId,
    approverId: userId,
    action: reviewAction,
    remarks: reviewRemarks,
    createdAt: new Date().toISOString()
  };
  approvals.push(newApproval);
  save(KEYS.APPROVALS, approvals);

  // Insert audit log
  writeAuditLog(
    userId,
    txn.companyId,
    `REVIEW_${reviewAction.toUpperCase()}`,
    'transaction',
    txn.id,
    { remarks: reviewRemarks, amount: txn.amount }
  );

  return { transaction: txn };
}

// BUDGET READ/WRITE
export function getBudgets(companyId: string, month: string): Budget[] {
  const all = load<Budget[]>(KEYS.BUDGETS, []);
  return all.filter(b => b.companyId === companyId && b.month === month);
}

export function savePlannedBudget(
  userId: string,
  companyId: string,
  categoryId: string,
  month: string,
  plannedAmount: number
): { error?: string; budget?: Budget } {
  // Only company admin or group admin
  if (!canAdminCompany(userId, companyId)) {
    return { error: 'Access Denied: Only Company Administrators can configure planned budget allocations.' };
  }

  if (plannedAmount < 0) {
    return { error: 'Invalid range: budget allocations must be non-negative.' };
  }

  // standardise month to 1st of month (YYYY-MM-01)
  const dateObj = new Date(month);
  const formattedMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-01`;

  const budgets = load<Budget[]>(KEYS.BUDGETS, []);
  const existingIndex = budgets.findIndex(
    b => b.companyId === companyId && b.categoryId === categoryId && b.month === formattedMonth
  );

  let resultBudget: Budget;

  if (existingIndex !== -1) {
    budgets[existingIndex].plannedAmount = plannedAmount;
    budgets[existingIndex].updatedAt = new Date().toISOString();
    resultBudget = budgets[existingIndex];
  } else {
    resultBudget = {
      id: `bud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      companyId,
      categoryId,
      month: formattedMonth,
      plannedAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    budgets.push(resultBudget);
  }

  save(KEYS.BUDGETS, budgets);

  writeAuditLog(
    userId,
    companyId,
    'UPDATE_BUDGET',
    'budget',
    resultBudget.id,
    { categoryId, month: formattedMonth, plannedAmount }
  );

  return { budget: resultBudget };
}

// ACCOUNTS PAYABLE
export function getPayables(userId: string, companyId: string): Payable[] {
  if (!canAccessCompany(userId, companyId)) return [];
  const payables = load<Payable[]>(KEYS.PAYABLES, []);
  return payables.filter(p => p.companyId === companyId);
}

export function insertPayable(userId: string, data: Omit<Payable, 'id' | 'status' | 'paidTransactionId' | 'createdAt' | 'updatedAt'>): { error?: string; payable?: Payable } {
  if (!canWriteFinance(userId, data.companyId)) {
    return { error: 'Access Denied: Insufficient authorization to log new accounts payable liabilities.' };
  }

  const payables = load<Payable[]>(KEYS.PAYABLES, []);
  const newPayable: Payable = {
    ...data,
    id: `pay-${Date.now()}`,
    status: 'unpaid',
    paidTransactionId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  payables.push(newPayable);
  save(KEYS.PAYABLES, payables);

  writeAuditLog(userId, data.companyId, 'CREATE_PAYABLE', 'payable', newPayable.id, { amount: data.amount, payee: data.payee });
  return { payable: newPayable };
}

export function markPayableAsPaid(userId: string, payableId: string, categoryId: string): { error?: string; payable?: Payable; txn?: Transaction } {
  const payables = load<Payable[]>(KEYS.PAYABLES, []);
  const idx = payables.findIndex(p => p.id === payableId);
  if (idx === -1) return { error: 'Invoice payable not found.' };

  const payable = payables[idx];

  // Enforce writing rules
  if (!canWriteFinance(userId, payable.companyId)) {
    return { error: 'Access Denied: You possess insufficient clearance to record disbursements.' };
  }

  if (payable.status === 'paid') {
    return { error: 'Liability already completed.' };
  }

  // Create a pending cash out transaction
  const txnRes = insertTransaction(userId, {
    companyId: payable.companyId,
    txnDate: new Date().toISOString().split('T')[0],
    type: 'cash_out',
    amount: payable.amount,
    categoryId,
    purpose: `Disbursement to: ${payable.payee} for AP settlement. ref: [${payable.description}]`,
    responsiblePerson: payable.payee,
    receiptPath: null,
    reversalOf: null
  });

  if (txnRes.error || !txnRes.transaction) {
    return { error: txnRes.error || 'Failed to trigger ledger disbursement transaction' };
  }

  payable.status = 'paid';
  payable.paidTransactionId = txnRes.transaction.id;
  payable.updatedAt = new Date().toISOString();
  payables[idx] = payable;
  save(KEYS.PAYABLES, payables);

  writeAuditLog(userId, payable.companyId, 'PAY_PAYABLE_SETTLEMENT', 'payable', payable.id, { amount: payable.amount, txnId: txnRes.transaction.id });

  return { payable, txn: txnRes.transaction };
}

// ACCOUNTS RECEIVABLE
export function getReceivables(userId: string, companyId: string): Receivable[] {
  if (!canAccessCompany(userId, companyId)) return [];
  const receivables = load<Receivable[]>(KEYS.RECEIVABLES, []);
  return receivables.filter(r => r.companyId === companyId);
}

export function insertReceivable(userId: string, data: Omit<Receivable, 'id' | 'status' | 'collectedTransactionId' | 'createdAt' | 'updatedAt'>): { error?: string; receivable?: Receivable } {
  if (!canWriteFinance(userId, data.companyId)) {
    return { error: 'Access Denied: Insufficient roles to declare accounts receivable claims.' };
  }

  const receivables = load<Receivable[]>(KEYS.RECEIVABLES, []);
  const newReceivable: Receivable = {
    ...data,
    id: `rec-${Date.now()}`,
    status: 'uncollected',
    collectedTransactionId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  receivables.push(newReceivable);
  save(KEYS.RECEIVABLES, receivables);

  writeAuditLog(userId, data.companyId, 'CREATE_RECEIVABLE', 'receivable', newReceivable.id, { amount: data.amount, payer: data.payer });
  return { receivable: newReceivable };
}

export function markReceivableAsCollected(userId: string, receivableId: string, categoryId: string): { error?: string; receivable?: Receivable; txn?: Transaction } {
  const receivables = load<Receivable[]>(KEYS.RECEIVABLES, []);
  const idx = receivables.findIndex(r => r.id === receivableId);
  if (idx === -1) return { error: 'Receivable asset not found.' };

  const receivable = receivables[idx];

  // Enforce writing rules
  if (!canWriteFinance(userId, receivable.companyId)) {
    return { error: 'Access Denied: You possess insufficient clearance to generate collection assets.' };
  }

  if (receivable.status === 'collected') {
    return { error: 'Asset collections already completed.' };
  }

  // Create pending cash in transaction
  const txnRes = insertTransaction(userId, {
    companyId: receivable.companyId,
    txnDate: new Date().toISOString().split('T')[0],
    type: 'cash_in',
    amount: receivable.amount,
    categoryId,
    purpose: `Collection from: ${receivable.payer} for AR settlement. ref: [${receivable.description}]`,
    responsiblePerson: receivable.payer,
    receiptPath: null,
    reversalOf: null
  });

  if (txnRes.error || !txnRes.transaction) {
    return { error: txnRes.error || 'Failed to trigger ledger cash collection transaction' };
  }

  receivable.status = 'collected';
  receivable.collectedTransactionId = txnRes.transaction.id;
  receivable.updatedAt = new Date().toISOString();
  receivables[idx] = receivable;
  save(KEYS.RECEIVABLES, receivables);

  writeAuditLog(userId, receivable.companyId, 'COLLECT_RECEIVABLE_SETTLEMENT', 'receivable', receivable.id, { amount: receivable.amount, txnId: txnRes.transaction.id });

  return { receivable, txn: txnRes.transaction };
}

// EMPLOYEES (ADMINS ONLY CONTROLS)
export function getEmployees(userId: string, companyId: string): Employee[] {
  // Only admins
  if (!canAdminCompany(userId, companyId)) return [];
  const employees = load<Employee[]>(KEYS.EMPLOYEES, []);
  return employees.filter(e => e.companyId === companyId);
}

export function saveEmployee(userId: string, data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): { error?: string; employee?: Employee } {
  if (!canAdminCompany(userId, data.companyId)) {
    return { error: 'Access Denied: Only Company Administrators can manage employee registers and payroll details.' };
  }

  const employees = load<Employee[]>(KEYS.EMPLOYEES, []);

  if (data.id) {
    const idx = employees.findIndex(e => e.id === data.id);
    if (idx !== -1) {
      employees[idx] = {
        ...employees[idx],
        fullName: data.fullName,
        position: data.position,
        baseSalary: data.baseSalary,
        active: data.active,
        updatedAt: new Date().toISOString()
      };
      save(KEYS.EMPLOYEES, employees);
      writeAuditLog(userId, data.companyId, 'UPDATE_EMPLOYEE', 'employee', data.id, { name: data.fullName, salary: data.baseSalary });
      return { employee: employees[idx] };
    }
  }

  const newEmp: Employee = {
    ...data,
    id: `emp-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  employees.push(newEmp);
  save(KEYS.EMPLOYEES, employees);

  writeAuditLog(userId, data.companyId, 'CREATE_EMPLOYEE', 'employee', newEmp.id, { name: data.fullName, salary: data.baseSalary });
  return { employee: newEmp };
}

// PAYROLL ACTIONS
export function getPayrollRuns(userId: string, companyId: string): PayrollRun[] {
  if (!canAdminCompany(userId, companyId)) return [];
  const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
  return runs.filter(r => r.companyId === companyId);
}

export function getPayrollItems(userId: string, runId: string): PayrollItem[] {
  const items = load<PayrollItem[]>(KEYS.PAYROLL_ITEMS, []);
  // Verify access of run first
  const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
  const run = runs.find(r => r.id === runId);
  if (!run || !canAdminCompany(userId, run.companyId)) return [];

  return items.filter(i => i.payrollRunId === runId);
}

export function createPayrollRun(
  userId: string,
  companyId: string,
  periodStart: string,
  periodEnd: string
): { error?: string; run?: PayrollRun; items?: PayrollItem[] } {
  if (!canAdminCompany(userId, companyId)) {
    return { error: 'Access Denied: Only Company Administrators can draft new payroll schedules.' };
  }

  if (new Date(periodEnd) < new Date(periodStart)) {
    return { error: 'Date constraint: Period end date must stand superior to the start date.' };
  }

  const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
  const items = load<PayrollItem[]>(KEYS.PAYROLL_ITEMS, []);
  const activeEmployees = getEmployees(userId, companyId).filter(e => e.active);

  if (activeEmployees.length === 0) {
    return { error: 'Payroll generation aborted: No active employees registered.' };
  }

  // Create target run
  const newRun: PayrollRun = {
    id: `run-${Date.now()}`,
    companyId,
    periodStart,
    periodEnd,
    status: 'draft',
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const createdItems: PayrollItem[] = [];

  activeEmployees.forEach(emp => {
    // Basic automatic statutory deductions estimates for Philippine context
    const sss = Math.min( emp.baseSalary * 0.045, 1350); 
    const philhealth = Math.min((emp.baseSalary * 0.05) / 2, 1600);
    const pagibig = 100.00;
    const tax = Math.max((emp.baseSalary - sss - philhealth - pagibig - 20833) * 0.15, 0); // basic estim
    const deductions = { sss, philhealth, pagibig, tax, other: 0 };
    
    const gross = emp.baseSalary;
    const net = Number((gross - (sss + philhealth + pagibig + tax)).toFixed(2));

    const item: PayrollItem = {
      id: `pitem-${Date.now()}-${emp.id}`,
      payrollRunId: newRun.id,
      employeeId: emp.id,
      gross,
      deductions,
      net,
      payoutTransactionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    createdItems.push(item);
    items.push(item);
  });

  runs.push(newRun);
  save(KEYS.PAYROLL_RUNS, runs);
  save(KEYS.PAYROLL_ITEMS, items);

  writeAuditLog(userId, companyId, 'GENERATE_PAYROLL_RUN', 'payroll_run', newRun.id, { periodStart, periodEnd });

  return { run: newRun, items: createdItems };
}

// Update single item deduction
export function updatePayrollDeductions(
  userId: string,
  itemId: string,
  deductions: Deductions
): { error?: string; item?: PayrollItem } {
  const items = load<PayrollItem[]>(KEYS.PAYROLL_ITEMS, []);
  const idx = items.findIndex(i => i.id === itemId);
  if (idx === -1) return { error: 'Payroll registry line not found.' };

  const item = items[idx];
  const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
  const run = runs.find(r => r.id === item.payrollRunId);

  if (!run || !canAdminCompany(userId, run.companyId)) {
    return { error: 'Access Denied: Only administrators can modify active payroll compensation elements.' };
  }

  if (run.status !== 'draft') {
    return { error: 'Audit state lock: Compensation deductions are locked after the run is finalized.' };
  }

  // Calculate net
  const totalDeducts = deductions.sss + deductions.philhealth + deductions.pagibig + deductions.tax + deductions.other;
  const net = item.gross - totalDeducts;
  if (net < 0) {
    return { error: 'Audit failure: deductions are mathematically superior to the gross compensation.' };
  }

  item.deductions = deductions;
  item.net = Number(net.toFixed(2));
  item.updatedAt = new Date().toISOString();
  items[idx] = item;
  save(KEYS.PAYROLL_ITEMS, items);

  return { item };
}

// Process payouts (generates pending bank-payout ledger items)
export function processPayrollPayout(
  userId: string,
  runId: string,
  mode: 'per_employee' | 'batch',
  categoryId: string // standard: payroll outbound
): { error?: string; run?: PayrollRun } {
  const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
  const runIdx = runs.findIndex(r => r.id === runId);
  if (runIdx === -1) return { error: 'Payroll schedule not found.' };

  const run = runs[runIdx];
  if (!canAdminCompany(userId, run.companyId)) {
    return { error: 'Access Denied: Admin authorization required to trigger bank payout generation.' };
  }

  if (run.status !== 'draft') {
    return { error: 'This disbursement run has already been fully processed.' };
  }

  const items = load<PayrollItem[]>(KEYS.PAYROLL_ITEMS, []);
  const runItems = items.filter(i => i.payrollRunId === runId);

  if (runItems.length === 0) {
    return { error: 'No payout files located in this register.' };
  }

  if (mode === 'per_employee') {
    const emps = load<Employee[]>(KEYS.EMPLOYEES, []);
    for (const item of runItems) {
      const empName = emps.find(e => e.id === item.employeeId)?.fullName || 'Employee';
      const res = insertTransaction(userId, {
        companyId: run.companyId,
        txnDate: new Date().toISOString().split('T')[0],
        type: 'cash_out',
        amount: item.net,
        categoryId,
        purpose: `Payroll payout matching period: [${run.periodStart} to ${run.periodEnd}] of supervisor: ${empName}`,
        responsiblePerson: empName,
        receiptPath: null,
        reversalOf: null
      });

      if (res.transaction) {
        item.payoutTransactionId = res.transaction.id;
        const itemIdx = items.findIndex(i => i.id === item.id);
        if (itemIdx !== -1) items[itemIdx] = item;
      }
    }
  } else {
    // Batch Summarised
    const totalNet = runItems.reduce((acc, curr) => acc + curr.net, 0);
    const res = insertTransaction(userId, {
      companyId: run.companyId,
      txnDate: new Date().toISOString().split('T')[0],
      type: 'cash_out',
      amount: totalNet,
      categoryId,
      purpose: `CONSOLIDATED Payroll batch payout matching period: [${run.periodStart} to ${run.periodEnd}] - ${runItems.length} heads`,
      responsiblePerson: 'Consolidated Bank Remittance',
      receiptPath: null,
      reversalOf: null
    });

    if (res.transaction) {
      for (const item of runItems) {
        item.payoutTransactionId = res.transaction.id;
        const itemIdx = items.findIndex(i => i.id === item.id);
        if (itemIdx !== -1) items[itemIdx] = item;
      }
    }
  }

  run.status = 'processed';
  run.updatedAt = new Date().toISOString();
  runs[runIdx] = run;

  save(KEYS.PAYROLL_RUNS, runs);
  save(KEYS.PAYROLL_ITEMS, items);

  writeAuditLog(userId, run.companyId, 'DISBURSE_PAYROLL_RUN', 'payroll_run', run.id, { mode });

  return { run };
}

// CONSOLIDATED AND SPECIFIC REPORT DATA GENERATORS (DAILY BALANCES, PL, VARIANCE)
export function getDailyBalances(companyId: string | null = null): DailyBalance[] {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []).filter(t => t.status === 'approved');
  
  const targetCompanies = companyId ? [companyId] : getCompanies().map(c => c.id);
  const result: DailyBalance[] = [];

  targetCompanies.forEach(compId => {
    const comTxns = allTxns.filter(t => t.companyId === compId);
    
    // Aggregate by date
    const dateMap: Record<string, { cashIn: number; cashOut: number }> = {};
    comTxns.forEach(t => {
      if (!dateMap[t.txnDate]) {
        dateMap[t.txnDate] = { cashIn: 0, cashOut: 0 };
      }
      if (t.type === 'cash_in') {
        dateMap[t.txnDate].cashIn += t.amount;
      } else {
        dateMap[t.txnDate].cashOut += t.amount;
      }
    });

    // Sort dates
    const sortedDates = Object.keys(dateMap).sort();

    let cumulativeBalance = 500000.00; // Starting Capital Injection Seeded on first run
    sortedDates.forEach(date => {
      const { cashIn, cashOut } = dateMap[date];
      result.push({
        companyId: compId,
        balanceDate: date,
        beginningBalance: cumulativeBalance,
        totalCashIn: cashIn,
        totalCashOut: cashOut,
        endingBalance: cumulativeBalance + cashIn - cashOut
      });
      cumulativeBalance = cumulativeBalance + cashIn - cashOut;
    });
  });

  return result;
}

export function getBudgetVsActual(companyId: string, month: string) {
  const budgets = getBudgets(companyId, month);
  const txns = load<Transaction[]>(KEYS.TRANSACTIONS, [])
    .filter(t => t.companyId === companyId && t.status === 'approved' && t.type === 'cash_out' && t.txnDate.startsWith(month.slice(0, 7)));

  const categories = getCategories(companyId).filter(c => c.type === 'cash_out');

  return categories.map(cat => {
    const planned = budgets.find(b => b.categoryId === cat.id)?.plannedAmount || 0;
    const actual = txns.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
    const variance = planned - actual;
    const usagePercent = planned > 0 ? (actual / planned) * 100 : 0;
    
    let status = 'within_budget';
    if (actual > planned) status = 'over_budget';
    else if (usagePercent >= 80) status = 'near_limit';

    return {
      companyId,
      categoryId: cat.id,
      categoryName: cat.name,
      month,
      plannedAmount: planned,
      actualAmount: actual,
      variance,
      usagePercent,
      status
    };
  });
}

export function getProfitLoss(companyId: string | null = null) {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []).filter(t => t.status === 'approved');
  const targetCompanies = companyId ? [companyId] : getCompanies().map(c => c.id);

  const result: Array<{
    companyId: string;
    companyName: string;
    month: string;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  }> = [];

  targetCompanies.forEach(compId => {
    const compName = getCompanies().find(c => c.id === compId)?.name || 'Unknown';
    const comTxns = allTxns.filter(t => t.companyId === compId);

    // Group by month
    const monthGroups: Record<string, { rev: number; exp: number }> = {};
    comTxns.forEach(t => {
      const monthStr = t.txnDate.slice(0, 7); // YYYY-MM
      if (!monthGroups[monthStr]) {
        monthGroups[monthStr] = { rev: 0, exp: 0 };
      }
      if (t.type === 'cash_in') {
        monthGroups[monthStr].rev += t.amount;
      } else {
        monthGroups[monthStr].exp += t.amount;
      }
    });

    Object.keys(monthGroups).forEach(month => {
      const { rev, exp } = monthGroups[month];
      result.push({
        companyId: compId,
        companyName: compName,
        month,
        totalRevenue: rev,
        totalExpenses: exp,
        netIncome: rev - exp
      });
    });
  });

  return result;
}
