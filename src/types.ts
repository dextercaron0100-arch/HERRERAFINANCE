/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CompanyRole = 'company_admin' | 'finance_officer' | 'approver' | 'viewer';
export type CashflowType = 'cash_in' | 'cash_out';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalAction = 'approved' | 'rejected';
export type PayableStatus = 'unpaid' | 'paid';
export type ReceivableStatus = 'uncollected' | 'collected';
export type PayrollStatus = 'draft' | 'pending_approval' | 'processed' | 'cancelled';

export interface Company {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  isGroupAdmin: boolean;
  createdAt: string;
}

export interface UserCompanyRole {
  userId: string;
  companyId: string;
  role: CompanyRole;
  createdAt: string;
}

export interface Category {
  id: string;
  companyId: string;
  name: string;
  type: CashflowType;
  createdAt: string;
}

export interface Transaction {
  id: string;
  companyId: string;
  txnDate: string; // YYYY-MM-DD
  type: CashflowType;
  amount: number;
  categoryId: string;
  purpose: string;
  responsiblePerson: string;
  receiptPath: string | null;
  status: TransactionStatus;
  encodedBy: string; // profile id
  reversalOf: string | null; // transaction id
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
