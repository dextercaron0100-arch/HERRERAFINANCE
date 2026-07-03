/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CompanyRole = 'company_admin' | 'finance_officer' | 'approver' | 'viewer' | 'owner';
export type CashflowType = 'cash_in' | 'cash_out';
export type TransactionStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type ApprovalAction = 'approved' | 'rejected';
export type PayableStatus = 'unpaid' | 'paid';
export type ReceivableStatus = 'uncollected' | 'collected';
export type PayrollStatus = 'draft' | 'pending_approval' | 'processed' | 'cancelled';

export interface Company {
  id: string;
  name: string;
  code: string;
  color?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  isGroupAdmin: boolean;
  dashboardLayout?: string[]; // Array of nav item IDs
  dashboardSectionsOrder?: string[]; // Array of dashboard section IDs
  createdAt: string;
}

export interface UserCompanyRole {
  userId: string;
  companyId: string;
  role: CompanyRole;
  allowedSections?: string[];
  createdAt: string;
}

export interface Category {
  id: string;
  companyId: string;
  name: string;
  type: CashflowType;
  createdAt: string;
}

export interface Attachment {
  id: string;
  companyId: string;
  entityType: 'transaction' | 'payable' | 'receivable' | 'payroll_run' | 'other';
  entityId: string | null;
  fileName: string;
  fileType: string;
  fileUrl: string; // Base64 data or fake URL
  uploadedBy: string;
  createdAt: string;
}

export interface CashAccount {
  id: string;
  companyId: string;
  accountType: 'Bank' | 'E-Wallet' | 'Cash on Hand' | 'Main Vault';
  bankName: string; // Security Bank, RCBC, GCash, Cash
  accountName: string;
  accountNumber: string;
  accountHolder: string;
  assignedCustodian?: string; // Custodian ID
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

export interface CashCustodian {
  id: string;
  name: string;
  companyId: string;
  role: string;
  assignedCashAccountId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CashLedgerEntry {
  id: string;
  date: string;
  companyId: string;
  cashAccountId: string;
  custodianId: string | null;
  transactionType: 'Cash Sale' | 'Cash Collection' | 'Cash Expense' | 'Cash Transfer' | 'Deposit to Bank' | 'Cash Received from Other Custodian' | 'Cash Released to Other Custodian' | 'Cash Adjustment' | 'Cash Short' | 'Cash Over';
  referenceNo: string;
  description: string;
  cashIn: number;
  cashOut: number;
  runningBalance: number;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
}

export interface CashCount {
  id: string;
  companyId: string;
  cashAccountId: string;
  custodianId: string;
  countDate: string;
  openingCash: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCash: number;
  actualCountedCash: number;
  difference: number;
  status: 'Draft' | 'Submitted' | 'Reviewed' | 'Approved' | 'Reconciled';
  remarks: string;
  preparedBy: string;
  reviewedBy: string | null;
  approvedBy: string | null;
  denominations: Denominations;
  createdAt: string;
}

export interface Denominations {
  qty1000: number;
  qty500: number;
  qty200: number;
  qty100: number;
  qty50: number;
  qty20: number;
  coinsTotal: number;
}

export interface BankDeposit {
  id: string;
  companyId: string;
  fromCashAccountId: string;
  fromCustodianId: string;
  toBankAccountId: string;
  depositDate: string;
  depositAmount: number;
  depositSlipNumber: string;
  proofOfDepositAttachment: string | null;
  depositedBy: string;
  status: 'Draft' | 'Submitted' | 'Verified' | 'Posted';
  remarks: string;
  createdAt: string;
}

export interface FundTransfer {
  id: string;
  requestDate: string;
  fromCompanyId: string;
  fromAccountId: string;
  toCompanyId: string;
  toAccountId: string;
  amount: number;
  purpose: string;
  receivedAs?: 'sales' | 'capital';
  requestedBy: string;
  approvalRequired: boolean;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  approvedBy: string | null;
  dateApproved: string | null;
  transferReferenceNumber: string | null;
  remarks: string;
  createdAt: string;
  splitGroupId?: string | null;
}

export interface BankStatementLine {
  id: string;
  cashAccountId: string;
  statementDate: string; // YYYY-MM-DD
  description: string;
  referenceNo: string;
  debit: number;
  credit: number;
  runningBalance: number;
  sourceFile: string | null;
  createdAt: string;
}

export interface BankReconciliation {
  id: string;
  companyId: string;
  cashAccountId: string;
  periodMonth: string; // YYYY-MM
  bookBalance: number;
  statementBalance: number;
  difference: number;
  status: 'draft' | 'for review' | 'reconciled';
  preparedBy: string;
  reviewedBy?: string;
  createdAt: string;
}

export interface ReconciliationMatch {
  id: string;
  reconciliationId: string;
  cashTransactionId: string; // ID of Transaction
  bankStatementLineId: string; // ID of BankStatementLine
  matchStatus: 'matched' | 'unmatched' | 'manual match';
  remarks: string | null;
  createdAt: string;
}

export interface Transaction {
  id: string;
  companyId: string;
  cashAccountId?: string; // Links to CashAccount
  txnDate: string; // YYYY-MM-DD
  type: CashflowType;
  amount: number;
  categoryId: string;
  purpose: string;
  responsiblePerson: string;
  remarks?: string | null;
  receiptPath: string | null;
  annotations?: { id: string; x: number; y: number; text: string; authorId: string; createdAt: string }[];
  mockMetadata?: { scanRef: string; timestamp: string; controlNumber?: string } | null;
  status: TransactionStatus;
  paymentMethod?: string;
  encodedBy: string; // profile id
  reversalOf: string | null; // transaction id
  transferRef?: string | null;
  tags?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  transactionId: string;
  approverId: string;
  action: ApprovalAction;
  remarks: string | null;
  createdAt: string;
}

export interface Budget {
  id: string;
  companyId: string;
  categoryId: string;
  month: string; // YYYY-MM-01
  plannedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payable {
  id: string;
  companyId: string;
  payee: string;
  description: string;
  amount: number;
  qty?: number;
  uom?: string;
  unitPrice?: number;
  remarks?: string;
  dueDate: string; // YYYY-MM-DD
  status: PayableStatus;
  paidTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Receivable {
  id: string;
  companyId: string;
  payer: string;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: ReceivableStatus;
  collectedTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  fullName: string;
  position: string;
  baseSalary: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: string;
  companyId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  status: PayrollStatus;
  mockMetadata?: { scanRef: string; timestamp: string; controlNumber?: string } | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deductions {
  sss: number;
  philhealth: number;
  pagibig: number;
  tax: number;
  other: number;
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  gross: number;
  deductions: Deductions;
  net: number;
  payoutTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  companyId: string | null;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, any>;
  createdAt: string;
}

export interface DailyBalance {
  companyId: string;
  balanceDate: string;
  beginningBalance: number;
  totalCashIn: number;
  totalCashOut: number;
  endingBalance: number;
}
