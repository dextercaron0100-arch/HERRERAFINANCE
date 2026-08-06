import * as XLSX from 'xlsx';
import { CashAccount, CashflowType, Category, Transaction } from '../types';

export const EXPECTED_HEADERS = [
  'DATE',
  'TAGS',
  'REMARKS',
  'PURPOSE/PAYEE',
  'CATEGORY',
  'PAYMENT METHOD',
  'AMOUNT',
] as const;

export type ExpectedHeader = (typeof EXPECTED_HEADERS)[number];
export type ColumnMapping = Record<ExpectedHeader, number>;

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

export type RowStatus = 'ready' | 'warning' | 'error';

export interface BatchRowResult {
  rowIndex: number;
  raw: Record<ExpectedHeader, string>;
  txnDate: string | null;
  amount: number | null;
  purpose: string;
  remarks: string;
  tags: string[] | null;
  categoryId: string | null;
  categoryName: string;
  type: CashflowType | null;
  cashAccountId: string | null;
  paymentMethodRaw: string;
  status: RowStatus;
  errors: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
  include: boolean;
}

export interface ValidationContext {
  categories: Category[];
  cashAccounts: CashAccount[];
  existingTransactions: Transaction[];
  defaultYear: number;
  preferredCashAccountIds?: Partial<Record<CashAccount['accountType'], string>>;
}

export interface BatchRowOverride {
  dateRaw?: string;
  amountRaw?: string;
  tagsRaw?: string;
  purpose?: string;
  remarks?: string;
  tags?: string[] | null;
  categoryId?: string | null;
  categoryName?: string;
  type?: CashflowType | null;
  cashAccountId?: string | null;
}

const MAX_PREVIEW_ROWS_WARNING = 800;
export const IMPORT_CHUNK_SIZE = 50;

export function parseWorkbookFile(buffer: ArrayBuffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

  if (rawRows.length === 0) return { headers: [], rows: [] };

  const headers = rawRows[0].map((h) => String(h ?? '').trim());
  const rows = rawRows
    .slice(1)
    .map((r) => headers.map((_, i) => String(r[i] ?? '').trim()))
    .filter((r) => r.some((cell) => cell !== ''));

  return { headers, rows };
}

function normalizeForMatch(s: string): string {
  return s.trim().toUpperCase().replace(/\.+$/, '').replace(/\s+/g, ' ');
}

export function autoDetectMapping(headers: string[]): ColumnMapping | null {
  const normalized = headers.map((h) => normalizeForMatch(h));
  const mapping = {} as ColumnMapping;
  for (const expected of EXPECTED_HEADERS) {
    const idx = normalized.indexOf(normalizeForMatch(expected));
    if (idx === -1) return null;
    mapping[expected] = idx;
  }
  return mapping;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₱$,\s]/g, '');
  if (!cleaned || !/^\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

function parseRowDate(raw: string, defaultYear: number): string | null {
  const s = raw.trim();
  if (!s) return null;

  const mdMatch = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mdMatch) {
    const month = parseInt(mdMatch[1], 10);
    const day = parseInt(mdMatch[2], 10);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > daysInMonth(defaultYear, month)) return null;
    return `${defaultYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const mdyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdyMatch) {
    const month = parseInt(mdyMatch[1], 10);
    const day = parseInt(mdyMatch[2], 10);
    let year = parseInt(mdyMatch[3], 10);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > daysInMonth(year, month)) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > daysInMonth(year, month)) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

function mapPaymentMethodToAccountType(raw: string): CashAccount['accountType'] | null {
  const s = normalizeForMatch(raw);
  if (['COH', 'CASH ON HAND', 'CASH'].includes(s)) return 'Cash on Hand';
  if (['BANK', 'BANK TRANSFER'].includes(s)) return 'Bank';
  if (['GCASH', 'E-WALLET', 'EWALLET', 'WALLET'].includes(s)) return 'E-Wallet';
  return null;
}

function purposeKey(purpose: string): string {
  return purpose.trim().toUpperCase().replace(/\s+/g, ' ');
}

function findDuplicate(
  row: Pick<BatchRowResult, 'rowIndex' | 'txnDate' | 'amount' | 'categoryId' | 'cashAccountId' | 'purpose'>,
  ctx: ValidationContext,
  otherRows: BatchRowResult[],
): string | undefined {
  if (!row.txnDate || row.amount === null || !row.categoryId || !row.cashAccountId) return undefined;
  const pKey = purposeKey(row.purpose);
  const existingMatch = ctx.existingTransactions.find(
    (t) =>
      t.txnDate === row.txnDate &&
      t.amount === row.amount &&
      t.categoryId === row.categoryId &&
      t.cashAccountId === row.cashAccountId &&
      purposeKey(t.purpose) === pKey,
  );
  if (existingMatch) return 'Matches a transaction already in the ledger';

  const fileMatch = otherRows.find(
    (r) =>
      r.rowIndex !== row.rowIndex &&
      r.txnDate === row.txnDate &&
      r.amount === row.amount &&
      r.categoryId === row.categoryId &&
      r.cashAccountId === row.cashAccountId &&
      purposeKey(r.purpose) === pKey,
  );
  if (fileMatch) return `Duplicate of row ${fileMatch.rowIndex} in this file`;

  return undefined;
}

/** Re-resolves a row after the user edits fields in the preview table. */
export function applyRowOverride(
  row: BatchRowResult,
  patch: BatchRowOverride,
  ctx: ValidationContext,
  otherRows: BatchRowResult[],
): BatchRowResult {
  const { dateRaw, amountRaw, tagsRaw, ...fieldPatch } = patch;
  const raw = { ...row.raw };

  if (dateRaw !== undefined) raw.DATE = dateRaw;
  if (amountRaw !== undefined) raw.AMOUNT = amountRaw;
  if (tagsRaw !== undefined) raw.TAGS = tagsRaw;
  if (fieldPatch.purpose !== undefined) raw['PURPOSE/PAYEE'] = fieldPatch.purpose;
  if (fieldPatch.remarks !== undefined) raw.REMARKS = fieldPatch.remarks;
  if (fieldPatch.tags !== undefined) raw.TAGS = fieldPatch.tags?.join(', ') || '';
  if (fieldPatch.categoryName !== undefined) raw.CATEGORY = fieldPatch.categoryName;

  const merged: BatchRowResult = {
    ...row,
    ...fieldPatch,
    raw,
    txnDate: dateRaw !== undefined ? parseRowDate(dateRaw, ctx.defaultYear) : row.txnDate,
    amount: amountRaw !== undefined ? parseAmount(amountRaw) : row.amount,
    tags:
      tagsRaw !== undefined
        ? tagsRaw.trim() && normalizeForMatch(tagsRaw) !== 'N/A'
          ? [tagsRaw.trim()]
          : null
        : fieldPatch.tags !== undefined
          ? fieldPatch.tags
          : row.tags,
  };

  const errors: string[] = [];
  if (!merged.txnDate) errors.push(`Invalid date: "${merged.raw.DATE}"`);
  if (merged.amount === null || merged.amount <= 0) errors.push(`Invalid amount: "${merged.raw.AMOUNT}"`);
  if (!merged.purpose) errors.push('Missing purpose/payee');
  if (!merged.categoryId) errors.push(`Category "${merged.categoryName}" not found for this company`);
  if (!merged.cashAccountId) errors.push('No cash account selected');

  const duplicateReason = findDuplicate(merged, ctx, otherRows);
  const isDuplicate = Boolean(duplicateReason);
  const status: RowStatus = errors.length > 0 ? 'error' : isDuplicate ? 'warning' : 'ready';
  const include =
    status === 'error'
      ? false
      : row.status === 'error'
        ? !isDuplicate
        : isDuplicate && !row.isDuplicate
          ? false
          : row.include;

  return {
    ...merged,
    errors,
    isDuplicate,
    duplicateReason,
    status,
    include,
  };
}

export function validateRow(
  rowIndex: number,
  rawRow: string[],
  mapping: ColumnMapping,
  ctx: ValidationContext,
  seenInFile: BatchRowResult[],
): BatchRowResult {
  const raw = {} as Record<ExpectedHeader, string>;
  EXPECTED_HEADERS.forEach((h) => {
    raw[h] = (rawRow[mapping[h]] ?? '').trim();
  });
  return validateRawRow(rowIndex, raw, ctx, seenInFile);
}

export function validateRawRow(
  rowIndex: number,
  raw: Record<ExpectedHeader, string>,
  ctx: ValidationContext,
  seenInFile: BatchRowResult[],
): BatchRowResult {
  const get = (key: ExpectedHeader) => (raw[key] ?? '').trim();
  const errors: string[] = [];

  const dateRaw = get('DATE');
  const txnDate = parseRowDate(dateRaw, ctx.defaultYear);
  if (!txnDate) errors.push(`Invalid date: "${dateRaw}"`);

  const amountRaw = get('AMOUNT');
  const amount = parseAmount(amountRaw);
  if (amount === null || amount <= 0) errors.push(`Invalid amount: "${amountRaw}"`);

  const purpose = get('PURPOSE/PAYEE');
  if (!purpose) errors.push('Missing purpose/payee');

  const categoryNameRaw = get('CATEGORY');
  const matchedCategories = ctx.categories.filter(
    (c) => normalizeForMatch(c.name) === normalizeForMatch(categoryNameRaw),
  );
  const matchedCategory = matchedCategories.length === 1 ? matchedCategories[0] : undefined;
  let categoryId: string | null = null;
  let type: CashflowType | null = null;
  if (!categoryNameRaw) {
    errors.push('Missing category');
  } else if (matchedCategory) {
    categoryId = matchedCategory.id;
    type = matchedCategory.type;
  } else if (matchedCategories.length > 1) {
    errors.push(`Multiple categories named "${categoryNameRaw}" found — please select one`);
  } else {
    errors.push(`Category "${categoryNameRaw}" not found for this company`);
  }

  const paymentMethodRaw = get('PAYMENT METHOD');
  const accountType = mapPaymentMethodToAccountType(paymentMethodRaw);
  let cashAccountId: string | null = null;
  if (!paymentMethodRaw) {
    errors.push('Missing payment method');
  } else if (!accountType) {
    errors.push(`Unrecognized payment method: "${paymentMethodRaw}"`);
  } else {
    const matches = ctx.cashAccounts.filter((a) => a.accountType === accountType && a.isActive);
    if (matches.length === 1) {
      cashAccountId = matches[0].id;
    } else if (matches.length === 0) {
      errors.push(`No active ${accountType} account found for this company`);
    } else {
      const preferredId = ctx.preferredCashAccountIds?.[accountType];
      const preferredAccount = matches.find((account) => account.id === preferredId);
      if (preferredAccount) {
        cashAccountId = preferredAccount.id;
      } else {
        errors.push(`Multiple ${accountType} accounts found — please select one`);
      }
    }
  }

  const tagsRaw = get('TAGS');
  const tags = tagsRaw && normalizeForMatch(tagsRaw) !== 'N/A' ? [tagsRaw] : null;
  const remarks = get('REMARKS');

  const duplicateReason = findDuplicate(
    { rowIndex, txnDate, amount, categoryId, cashAccountId, purpose },
    ctx,
    seenInFile,
  );
  const isDuplicate = Boolean(duplicateReason);

  const status: RowStatus = errors.length > 0 ? 'error' : isDuplicate ? 'warning' : 'ready';

  return {
    rowIndex,
    raw,
    txnDate,
    amount,
    purpose,
    remarks,
    tags,
    categoryId,
    categoryName: categoryNameRaw,
    type,
    cashAccountId,
    paymentMethodRaw,
    status,
    errors,
    isDuplicate,
    duplicateReason,
    include: status !== 'error' && !isDuplicate,
  };
}

export function validateAllRows(
  rows: string[][],
  mapping: ColumnMapping,
  ctx: ValidationContext,
): BatchRowResult[] {
  const results: BatchRowResult[] = [];
  rows.forEach((r, i) => {
    results.push(validateRow(i + 1, r, mapping, ctx, results));
  });
  return results;
}

export function isLargeBatch(rowCount: number): boolean {
  return rowCount > MAX_PREVIEW_ROWS_WARNING;
}

export function downloadBatchTemplate(): void {
  const headers = [...EXPECTED_HEADERS];
  const sampleRows = [
    ['7/30', 'P122', 'PO# 2026-00047', 'BANGA- ZJHC CORP. - Why Not', 'PURCHASES', 'COH', '3810.00'],
    ['7/30', 'N/a', 'DSR 260061', 'BANGA -SALES- JULY 27', 'SALES', 'COH', '10408.00'],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, 'HERRERA-FINANCE-BATCH-UPLOAD-TEMPLATE.xlsx');
}
