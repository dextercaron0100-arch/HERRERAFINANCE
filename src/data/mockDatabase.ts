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
  DailyBalance,
  FundTransfer,
  CustomDeadline,
  AccountingPeriod
} from "../types";

// Storage keys
const DB_PREFIX = "finance_db_v3_";
const OWNER_EMAILS = ["mark@herrera.com", "ryan@herrera.com", "marvin@herrera.com"];
const PERIOD_CLOSE_MANAGER_EMAILS = [...OWNER_EMAILS, "it@herrera.com"];
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
  ATTACHMENTS: `${DB_PREFIX}attachments`,
  CASH_ACCOUNTS: `${DB_PREFIX}cash_accounts`,
  BANK_STATEMENT_LINES: `${DB_PREFIX}bank_statement_lines`,
  BANK_RECONCILIATIONS: `${DB_PREFIX}bank_reconciliations`,
  RECONCILIATION_MATCHES: `${DB_PREFIX}reconciliation_matches`,
  CASH_CUSTODIANS: `${DB_PREFIX}cash_custodians`,
  CASH_LEDGER_ENTRIES: `${DB_PREFIX}cash_ledger_entries`,
  CASH_COUNTS: `${DB_PREFIX}cash_counts`,
  BANK_DEPOSITS: `${DB_PREFIX}bank_deposits`,
  FUND_TRANSFERS: `${DB_PREFIX}fund_transfers`,
  CUSTOM_DEADLINES: `${DB_PREFIX}custom_deadlines`,
  ACCOUNTING_PERIODS: `${DB_PREFIX}accounting_periods`,
  CURRENT_USER_ID: `${DB_PREFIX}current_user_id`,
  SELECTED_COMPANY_ID: `${DB_PREFIX}selected_company_id`,
  CONTROL_NUMBER: `${DB_PREFIX}control_numbers`,
};

export function getNextControlNumber(): string {
  const current = load<number>(KEYS.CONTROL_NUMBER, 1);
  save(KEYS.CONTROL_NUMBER, current + 1);
  return current.toString().padStart(3, "0");
}

// Seed lists
export const SEED_COMPANIES: Company[] = [
  {
    id: "c-bls",
    name: "Blesscent",
    code: "BMC",
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "c-bgs",
    name: "Bigstop",
    code: "BS",
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "c-frh",
    name: "Franchise Hub",
    code: "HFH",
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "c-sct",
    name: "Scentimo",
    code: "SMC",
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "c-hbp",
    name: "Herrera Building Property",
    code: "HBP",
    createdAt: "2026-01-01T08:00:00Z",
  },
];

export const SEED_PROFILES: Profile[] = [
  {
    id: "u-mark",
    fullName: "Mark Herrera",
    email: "mark@herrera.com",
    isGroupAdmin: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "u-ryan",
    fullName: "Ryan Herrera",
    email: "ryan@herrera.com",
    isGroupAdmin: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "u-marvin",
    fullName: "Marvin Herrera",
    email: "marvin@herrera.com",
    isGroupAdmin: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "u-accounting",
    fullName: "Accounting",
    email: "accounting@herrera.com",
    isGroupAdmin: false,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "u-it",
    fullName: "IT Support",
    email: "it@herrera.com",
    isGroupAdmin: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "u-claine-bgs",
    fullName: "Claine (Bigstop)",
    email: "claineaccountingbgstop@herrera.com",
    isGroupAdmin: false,
    createdAt: "2026-07-07T08:00:00Z",
  },
  {
    id: "u-claine-frh",
    fullName: "Claine (Franchise Hub)",
    email: "claineaccountingfanchiseHub@herrera.com",
    isGroupAdmin: false,
    createdAt: "2026-07-07T08:00:00Z",
  },
  {
    id: "u-claine-hbp",
    fullName: "Claine (Herrera Building Property)",
    email: "claineaccountingHerrerabuildingproperty@herrera.com",
    isGroupAdmin: false,
    createdAt: "2026-07-07T08:00:00Z",
  },
  {
    id: "u-kayla-bls",
    fullName: "Kayla (Blesscent)",
    email: "kaylaaccountingblesscent@herrera.com",
    isGroupAdmin: false,
    createdAt: "2026-07-07T08:00:00Z",
  },
  {
    id: "u-kayla-sct",
    fullName: "Kayla (Scentimo)",
    email: "kaylaaccountingscentimo@herrera.com",
    isGroupAdmin: false,
    createdAt: "2026-07-07T08:00:00Z",
  },
];

// All sidebar sections except "dashboard" and "settings" - used for accounts
// that should be scoped to a single company and not see those two pages.
const SECTIONS_WITHOUT_DASHBOARD_AND_SETTINGS = [
  "accounting_workbench", "ledger", "month_end_close", "money_flow", "budgets", "approvals",
  "messages", "assistant", "owner_dashboard", "pay_rec", "payroll",
  "tax_compliance", "audit_log",
];

export const SEED_ROLES: UserCompanyRole[] = [
  { userId: "u-claine-bgs", companyId: "c-bgs", role: "finance_officer", allowedSections: SECTIONS_WITHOUT_DASHBOARD_AND_SETTINGS, createdAt: "2026-07-07T08:00:00Z" },
  { userId: "u-claine-frh", companyId: "c-frh", role: "finance_officer", allowedSections: SECTIONS_WITHOUT_DASHBOARD_AND_SETTINGS, createdAt: "2026-07-07T08:00:00Z" },
  { userId: "u-claine-hbp", companyId: "c-hbp", role: "finance_officer", allowedSections: SECTIONS_WITHOUT_DASHBOARD_AND_SETTINGS, createdAt: "2026-07-07T08:00:00Z" },
  { userId: "u-kayla-bls", companyId: "c-bls", role: "finance_officer", allowedSections: SECTIONS_WITHOUT_DASHBOARD_AND_SETTINGS, createdAt: "2026-07-07T08:00:00Z" },
  { userId: "u-kayla-sct", companyId: "c-sct", role: "finance_officer", allowedSections: SECTIONS_WITHOUT_DASHBOARD_AND_SETTINGS, createdAt: "2026-07-07T08:00:00Z" },
];

const SHARED_CATEGORIES = [
  "Sales",
  "Capital",
  "Accounts Payable",
  "Accounts Receivable",
  "Rent Exp.",
  "Payout Exp.",
  "Permit Exp.",
  "Salary Exp.",
  "Bonus Exp.",
  "Marketing Exp.",
  "Govt Contibution Exp.",
  "Electric Utility",
  "Water Utility",
  "Internet Utility",
  "Transportation",
  "Office Supplies",
  "Store Supplies",
  "Cleaning Materials",
  "Office Equipment",
  "Fix & Furnitures",
  "Software & Subscription",
  "Repair & Maintenance",
  "Bank Fee",
  "Shipping Fee",
  "Purchases",
];

export const DEFAULT_CASH_IN_CATEGORIES = [...SHARED_CATEGORIES];

export const DEFAULT_CASH_OUT_CATEGORIES = [...SHARED_CATEGORIES];

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { toast } from "sonner";

let hasNotifiedQuota = false;

export function useDBUpdate() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick((c) => c + 1);
    window.addEventListener("db-update", h);
    return () => window.removeEventListener("db-update", h);
  }, []);
  return tick;
}

export type DatabaseSyncStatus = "saved" | "syncing" | "failed";

export interface DatabaseSyncSnapshot {
  status: DatabaseSyncStatus;
  pendingWrites: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  retryAttempt: number;
}

const DB_SYNC_EVENT = "db-sync-status";
const pendingSyncKeys = new Set<string>();
const failedSyncKeys = new Set<string>();
const syncVersions = new Map<string, number>();
const syncRetryAttempts = new Map<string, number>();
let databaseSyncSnapshot: DatabaseSyncSnapshot = {
  status: "saved",
  pendingWrites: 0,
  lastSyncedAt: null,
  lastError: null,
  retryAttempt: 0,
};

const publishDatabaseSyncSnapshot = (updates: Partial<DatabaseSyncSnapshot>) => {
  databaseSyncSnapshot = {
    ...databaseSyncSnapshot,
    ...updates,
    pendingWrites: pendingSyncKeys.size,
  };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<DatabaseSyncSnapshot>(DB_SYNC_EVENT, {
      detail: databaseSyncSnapshot,
    }));
  }
};

const queueSyncKey = (key: string): number => {
  const version = (syncVersions.get(key) ?? 0) + 1;
  syncVersions.set(key, version);
  pendingSyncKeys.add(key);
  failedSyncKeys.delete(key);
  publishDatabaseSyncSnapshot({
    status: "syncing",
    lastError: failedSyncKeys.size > 0 ? databaseSyncSnapshot.lastError : null,
  });
  return version;
};

const markSyncStarted = () => {
  publishDatabaseSyncSnapshot({
    status: "syncing",
    lastError: failedSyncKeys.size > 0 ? databaseSyncSnapshot.lastError : null,
  });
};

const markSyncSucceeded = (key: string, version: number) => {
  if (syncVersions.get(key) !== version) return;
  pendingSyncKeys.delete(key);
  failedSyncKeys.delete(key);
  syncRetryAttempts.delete(key);
  const hasFailures = failedSyncKeys.size > 0;
  publishDatabaseSyncSnapshot({
    status: hasFailures
      ? "failed"
      : pendingSyncKeys.size > 0
        ? "syncing"
        : "saved",
    lastSyncedAt: new Date().toISOString(),
    lastError: hasFailures ? databaseSyncSnapshot.lastError : null,
    retryAttempt: hasFailures ? databaseSyncSnapshot.retryAttempt : 0,
  });
};

const getSyncErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "Cloud save failed");
  }
  return "Cloud save failed";
};

const markSyncFailed = (key: string, error: unknown): number => {
  pendingSyncKeys.add(key);
  failedSyncKeys.add(key);
  const retryAttempt = (syncRetryAttempts.get(key) ?? 0) + 1;
  syncRetryAttempts.set(key, retryAttempt);
  publishDatabaseSyncSnapshot({
    status: "failed",
    lastError: getSyncErrorMessage(error),
    retryAttempt,
  });
  return retryAttempt;
};

const getRetryDelay = (attempt: number) =>
  Math.min(60_000, 2_000 * (2 ** Math.min(attempt - 1, 5)));

const FIRESTORE_WRITE_TIMEOUT_MS = 15_000;

const withFirestoreWriteTimeout = async <T>(operation: Promise<T>): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Cloud save timed out. Check the internet connection.")),
      FIRESTORE_WRITE_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export function getDatabaseSyncSnapshot(): DatabaseSyncSnapshot {
  return databaseSyncSnapshot;
}

export function useDatabaseSyncStatus(): DatabaseSyncSnapshot {
  const [snapshot, setSnapshot] = useState(getDatabaseSyncSnapshot);
  useEffect(() => {
    const handleStatus = (event: Event) => {
      setSnapshot((event as CustomEvent<DatabaseSyncSnapshot>).detail);
    };
    const handleOnline = () => {
      retryPendingDatabaseWrites().catch(() => undefined);
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingSyncKeys.size === 0) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener(DB_SYNC_EVENT, handleStatus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener(DB_SYNC_EVENT, handleStatus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
  return snapshot;
}

// Localstorage helper
let memoryDb: Record<string, any> | null = null;
let dbInitialized = false;
let isSeeding = false;
let lastLocalWriteTime = 0;
const IS_PRODUCTION = import.meta.env.PROD;

type EntityCollectionKey = typeof KEYS.TRANSACTIONS | typeof KEYS.AUDIT_LOGS;
type EntityRecord = { id: string; updatedAt?: string; createdAt?: string };
type EntityChangeSet = {
  upserts?: EntityRecord[];
  deleteIds?: string[];
  skipRemote?: boolean;
};

const ENTITY_COLLECTION_NAMES: Record<EntityCollectionKey, string> = {
  [KEYS.TRANSACTIONS]: "transactions",
  [KEYS.AUDIT_LOGS]: "audit_logs",
};
const ENTITY_MIGRATION_COLLECTION = "appData";
const ENTITY_MIGRATION_DOCUMENT = "storage_migration_transactions-audit-logs-v1";
const ENTITY_RECOVERY_KEY = `${DB_PREFIX}unsynced_entity_recovery`;
const FIRESTORE_BATCH_OPERATION_LIMIT = 400;
const LOCAL_AUDIT_LOG_LIMIT = 1000;
const pendingEntityUpserts: Partial<Record<EntityCollectionKey, Map<string, EntityRecord>>> = {};
const pendingEntityDeletes: Partial<Record<EntityCollectionKey, Set<string>>> = {};
const pendingEntityWriteTimers: Partial<Record<EntityCollectionKey, ReturnType<typeof setTimeout>>> = {};

const isEntityCollectionKey = (key: string): key is EntityCollectionKey =>
  key === KEYS.TRANSACTIONS || key === KEYS.AUDIT_LOGS;

const sanitizeEntityRecord = <T extends EntityRecord>(record: T): T =>
  JSON.parse(JSON.stringify(record)) as T;

const commitFirestoreOperations = async (
  operations: Array<{ collectionName: string; id: string; data?: EntityRecord; remove?: boolean }>,
  onProgress?: (completed: number, total: number) => void,
): Promise<void> => {
  if (!db || operations.length === 0) return;

  let completed = 0;
  for (let i = 0; i < operations.length; i += FIRESTORE_BATCH_OPERATION_LIMIT) {
    const chunk = operations.slice(i, i + FIRESTORE_BATCH_OPERATION_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((operation) => {
      const recordRef = doc(db, operation.collectionName, operation.id);
      if (operation.remove) batch.delete(recordRef);
      else batch.set(recordRef, sanitizeEntityRecord(operation.data!), { merge: true });
    });
    await withFirestoreWriteTimeout(batch.commit());
    completed += chunk.length;
    onProgress?.(completed, operations.length);
  }
};

const commitEntityChanges = async (
  key: EntityCollectionKey,
  upserts: EntityRecord[] = [],
  deleteIds: string[] = [],
): Promise<void> => {
  const collectionName = ENTITY_COLLECTION_NAMES[key];
  await commitFirestoreOperations([
    ...upserts.map((data) => ({ collectionName, id: data.id, data })),
    ...deleteIds.map((id) => ({ collectionName, id, remove: true })),
  ]);
};

const clearEntityCollections = async (keys: EntityCollectionKey[]): Promise<void> => {
  if (!db) return;
  const snapshots = await Promise.all(
    keys.map((key) => getDocs(collection(db, ENTITY_COLLECTION_NAMES[key]))),
  );
  await commitFirestoreOperations(
    snapshots.flatMap((snapshot, index) =>
      snapshot.docs.map((entry) => ({
        collectionName: ENTITY_COLLECTION_NAMES[keys[index]],
        id: entry.id,
        remove: true,
      })),
    ),
  );
};

const requeueEntityChanges = (
  key: EntityCollectionKey,
  upserts: EntityRecord[],
  deleteIds: string[],
) => {
  const upsertQueue = pendingEntityUpserts[key] ?? new Map<string, EntityRecord>();
  const deleteQueue = pendingEntityDeletes[key] ?? new Set<string>();
  upserts.forEach((record) => {
    upsertQueue.set(record.id, record);
    deleteQueue.delete(record.id);
  });
  deleteIds.forEach((id) => {
    deleteQueue.add(id);
    upsertQueue.delete(id);
  });
  pendingEntityUpserts[key] = upsertQueue;
  pendingEntityDeletes[key] = deleteQueue;
};

const scheduleEntityFlush = (
  key: EntityCollectionKey,
  version: number,
  delay: number,
) => {
  const existingTimer = pendingEntityWriteTimers[key];
  if (existingTimer) clearTimeout(existingTimer);
  pendingEntityWriteTimers[key] = setTimeout(() => {
    if (syncVersions.get(key) !== version) return;
    flushPendingEntityWrites([key]).catch(() => undefined);
  }, delay);
};

export const flushPendingEntityWrites = async (
  keys: EntityCollectionKey[] = [KEYS.TRANSACTIONS, KEYS.AUDIT_LOGS],
): Promise<void> => {
  for (const key of keys) {
    const timer = pendingEntityWriteTimers[key];
    if (timer) clearTimeout(timer);
    delete pendingEntityWriteTimers[key];

    const upserts = Array.from(pendingEntityUpserts[key]?.values() ?? []);
    const deleteIds = Array.from(pendingEntityDeletes[key] ?? []);
    pendingEntityUpserts[key]?.clear();
    pendingEntityDeletes[key]?.clear();
    if (upserts.length === 0 && deleteIds.length === 0) continue;
    const version = syncVersions.get(key) ?? queueSyncKey(key);
    markSyncStarted();

    try {
      if (localStorage.getItem("quota_exceeded") === "true") {
        await enableNetwork(db);
      }
      await commitEntityChanges(key, upserts, deleteIds);
      localStorage.removeItem("quota_exceeded");
      markSyncSucceeded(key, version);
    } catch (error: any) {
      requeueEntityChanges(key, upserts, deleteIds);
      if (error?.code === "resource-exhausted") {
        localStorage.setItem("quota_exceeded", "true");
      }
      const attempt = markSyncFailed(key, error);
      scheduleEntityFlush(key, version, getRetryDelay(attempt));
      console.error(`Firestore ${ENTITY_COLLECTION_NAMES[key]} write failed:`, error);
      if (IS_PRODUCTION && attempt === 1) {
        toast.error("Save not confirmed", {
          description: "The cloud save failed. Retrying automatically; keep this page open.",
        });
      }
      throw error;
    }
  }
};

const queueEntityChanges = (key: EntityCollectionKey, changes: EntityChangeSet) => {
  requeueEntityChanges(key, changes.upserts ?? [], changes.deleteIds ?? []);
  const version = queueSyncKey(key);
  scheduleEntityFlush(key, version, FIRESTORE_WRITE_DEBOUNCE_MS);
};

const mergeEntityRecords = <T extends EntityRecord>(legacy: T[], current: T[]): T[] => {
  const merged = new Map<string, T>();
  legacy.forEach((record) => merged.set(record.id, record));
  current.forEach((record) => {
    const existing = merged.get(record.id);
    if (!existing) {
      merged.set(record.id, record);
      return;
    }
    const existingTime = Date.parse(existing.updatedAt || existing.createdAt || "") || 0;
    const currentTime = Date.parse(record.updatedAt || record.createdAt || "") || 0;
    if (currentTime >= existingTime) merged.set(record.id, record);
  });
  return Array.from(merged.values());
};

const cacheEntityRecords = (key: EntityCollectionKey, records: EntityRecord[]) => {
  let ordered = [...records].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || left.updatedAt || "") || 0;
    const rightTime = Date.parse(right.createdAt || right.updatedAt || "") || 0;
    return rightTime - leftTime;
  });
  if (key === KEYS.AUDIT_LOGS) ordered = ordered.slice(0, LOCAL_AUDIT_LOG_LIMIT);
  localStorage.setItem(key, JSON.stringify(ordered));
  if (!memoryDb) memoryDb = {};
  memoryDb[key] = ordered;
};

const readLocalEntityCache = <T extends EntityRecord>(key: EntityCollectionKey): T[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const preserveUnsyncedLocalRecords = (
  localTransactions: Transaction[],
  localAuditLogs: AuditLog[],
  remoteTransactions: Transaction[],
  remoteAuditLogs: AuditLog[],
) => {
  const transactionIds = new Set(remoteTransactions.map((record) => record.id));
  const auditIds = new Set(remoteAuditLogs.map((record) => record.id));
  const unsyncedTransactions = localTransactions.filter((record) => !transactionIds.has(record.id));
  const unsyncedAuditLogs = localAuditLogs.filter((record) => !auditIds.has(record.id));
  if (unsyncedTransactions.length === 0 && unsyncedAuditLogs.length === 0) return;

  localStorage.setItem(
    ENTITY_RECOVERY_KEY,
    JSON.stringify({
      capturedAt: new Date().toISOString(),
      transactions: unsyncedTransactions,
      auditLogs: unsyncedAuditLogs,
    }),
  );
  console.warn("Unsynced local finance records were preserved for recovery.", {
    transactions: unsyncedTransactions.length,
    auditLogs: unsyncedAuditLogs.length,
  });
};

export function getUnsyncedEntityRecoverySnapshot(): {
  capturedAt: string;
  transactions: Transaction[];
  auditLogs: AuditLog[];
} | null {
  try {
    const snapshot = JSON.parse(localStorage.getItem(ENTITY_RECOVERY_KEY) || "null");
    return snapshot && Array.isArray(snapshot.transactions) && Array.isArray(snapshot.auditLogs)
      ? snapshot
      : null;
  } catch {
    return null;
  }
}

// Coalesce rapid successive writes to the same key into a single Firestore write,
// so bursts of edits (bulk entry, fast clicking) don't send one write per edit.
const FIRESTORE_WRITE_DEBOUNCE_MS = 800;
const pendingWriteTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// Merges a local array with the latest remote array record-by-record, keeping
// whichever copy of each id was modified most recently (by updatedAt/createdAt).
// Without this, a client whose in-memory copy predates someone else's change
// (e.g. another approver clearing a transaction moments ago) would blindly
// overwrite the whole collection on its next unrelated save, silently
// reverting that change — surfacing as an approved transaction "reappearing"
// back in the Pending queue.
//
// This union-by-id approach has one blind spot: it can't tell "this id was
// never on this client" apart from "this id was just deleted here" — both
// look like "absent locally, present remotely/elsewhere" and would
// otherwise resurrect a deleted record. recentDeletions is a short-lived
// per-key tombstone set that delete*() functions populate so this merge
// (and the realtime listener below) can exclude those ids regardless of
// what a stale writer still has.
const recentDeletions: Record<string, Map<string, number>> = {};
const DELETION_TOMBSTONE_MS = 3 * 60 * 1000; // 3 minutes — comfortably longer than the write/echo/re-render cycle

const recordDeletions = (key: string, ids: (string | null | undefined)[]) => {
  if (!recentDeletions[key]) recentDeletions[key] = new Map();
  const now = Date.now();
  ids.forEach((id) => {
    if (id) recentDeletions[key]!.set(id, now);
  });
};

const stripTombstonedIds = (key: string, arr: any[]): any[] => {
  const tomb = recentDeletions[key];
  if (!tomb || tomb.size === 0) return arr;
  const now = Date.now();
  for (const [id, ts] of tomb) {
    if (now - ts > DELETION_TOMBSTONE_MS) tomb.delete(id);
  }
  if (tomb.size === 0) return arr;
  return arr.filter((item) => !(item && tomb.has(item.id)));
};

const mergeArraysByFreshness = (key: string, localArr: any[], remoteArr: any[]): any[] => {
  const remoteById = new Map(remoteArr.filter((i) => i && i.id != null).map((i) => [i.id, i]));
  const localById = new Map(localArr.filter((i) => i && i.id != null).map((i) => [i.id, i]));
  const allIds = new Set([...remoteById.keys(), ...localById.keys()]);
  const merged: any[] = [];
  allIds.forEach((id) => {
    const localItem = localById.get(id);
    const remoteItem = remoteById.get(id);
    if (localItem && remoteItem) {
      const localTime = Date.parse(localItem.updatedAt || localItem.createdAt || "") || 0;
      const remoteTime = Date.parse(remoteItem.updatedAt || remoteItem.createdAt || "") || 0;
      merged.push(remoteTime > localTime ? remoteItem : localItem);
    } else {
      merged.push(localItem || remoteItem);
    }
  });
  return stripTombstonedIds(key, merged);
};

const scheduleFirestoreWrite = (
  key: string,
  delay = FIRESTORE_WRITE_DEBOUNCE_MS,
  existingVersion?: number,
) => {
  const version = existingVersion ?? queueSyncKey(key);
  if (pendingWriteTimers[key]) clearTimeout(pendingWriteTimers[key]);
  pendingWriteTimers[key] = setTimeout(() => {
    delete pendingWriteTimers[key];
    executeFirestoreWrite(key, version).catch(() => undefined);
  }, delay);
};

async function executeFirestoreWrite(key: string, version: number): Promise<void> {
  if (syncVersions.get(key) !== version) return;
  const latest = localStorage.getItem(key);
  if (latest === null) {
    markSyncSucceeded(key, version);
    return;
  }

  markSyncStarted();
  try {
    if (localStorage.getItem("quota_exceeded") === "true") {
      await enableNetwork(db);
    }

    const docRef = doc(db, "appData", key);
    const localVal = JSON.parse(latest);
    let cleanVal = localVal;

    if (Array.isArray(localVal)) {
      cleanVal = stripTombstonedIds(key, localVal);
      try {
        const remoteSnap = await getDoc(docRef);
        const remoteVal = remoteSnap.exists() ? remoteSnap.data()?.data : null;
        if (Array.isArray(remoteVal)) {
          cleanVal = mergeArraysByFreshness(key, cleanVal, remoteVal);
        }
      } catch {
        // Couldn't read the latest snapshot (offline, etc.) — fall back to
        // writing the local copy as-is rather than blocking the save.
      }
    }

    await safeSetDoc(docRef, { data: sanitizeForFirestore(cleanVal) }, { merge: true });
    markSyncSucceeded(key, version);
  } catch (error) {
    const attempt = markSyncFailed(key, error);
    scheduleFirestoreWrite(key, getRetryDelay(attempt), version);
    if (IS_PRODUCTION && attempt === 1) {
      window.dispatchEvent(new Event("db-update"));
      toast.error("Save not confirmed", {
        description: "The cloud save failed. Retrying automatically; keep this page open.",
      });
    }
    throw error;
  }
}

export async function retryPendingDatabaseWrites(): Promise<void> {
  const keys = Array.from(pendingSyncKeys);
  if (keys.length === 0) return;

  markSyncStarted();
  try {
    await enableNetwork(db);
    localStorage.removeItem("quota_exceeded");
  } catch (error) {
    keys.forEach((key) => markSyncFailed(key, error));
    throw error;
  }

  const entityKeys = keys.filter(isEntityCollectionKey);
  const appDataKeys = keys.filter((key) => !isEntityCollectionKey(key));

  entityKeys.forEach((key) => {
    const timer = pendingEntityWriteTimers[key];
    if (timer) clearTimeout(timer);
    delete pendingEntityWriteTimers[key];
  });
  appDataKeys.forEach((key) => {
    const timer = pendingWriteTimers[key];
    if (timer) clearTimeout(timer);
    delete pendingWriteTimers[key];
  });

  const results = await Promise.allSettled([
    flushPendingEntityWrites(entityKeys),
    ...appDataKeys.map((key) => executeFirestoreWrite(key, syncVersions.get(key)!)),
  ]);
  const failed = results.find((result) => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
}

export async function hydrateDatabaseFromFirestore(): Promise<void> {
  if (!IS_PRODUCTION || !db) return;

  try {
    const localTransactionsBeforeHydration = readLocalEntityCache<Transaction>(KEYS.TRANSACTIONS);
    const localAuditLogsBeforeHydration = readLocalEntityCache<AuditLog>(KEYS.AUDIT_LOGS);
    const [legacySnapshot, transactionSnapshot, auditSnapshot, migrationSnapshot] = await Promise.all([
      getDocs(collection(db, "appData")),
      getDocs(collection(db, ENTITY_COLLECTION_NAMES[KEYS.TRANSACTIONS])),
      getDocs(
        query(
          collection(db, ENTITY_COLLECTION_NAMES[KEYS.AUDIT_LOGS]),
          orderBy("createdAt", "desc"),
          firestoreLimit(LOCAL_AUDIT_LOG_LIMIT),
        ),
      ),
      getDoc(doc(db, ENTITY_MIGRATION_COLLECTION, ENTITY_MIGRATION_DOCUMENT)),
    ]);

    if (legacySnapshot.empty && transactionSnapshot.empty && auditSnapshot.empty) {
      throw new Error("The production Firestore database is empty. Seed data was not created for safety.");
    }

    if (!memoryDb) memoryDb = {};
    let legacyTransactions: Transaction[] = [];
    let legacyAuditLogs: AuditLog[] = [];
    legacySnapshot.forEach(remoteDoc => {
      const key = remoteDoc.id;
      if (key === "master" || !Object.values(KEYS).includes(key)) return;
      const remoteData = remoteDoc.data().data;
      if (remoteData === undefined) return;
      if (key === KEYS.TRANSACTIONS) {
        legacyTransactions = Array.isArray(remoteData) ? remoteData : [];
        return;
      }
      if (key === KEYS.AUDIT_LOGS) {
        legacyAuditLogs = Array.isArray(remoteData) ? remoteData : [];
        return;
      }
      localStorage.setItem(key, JSON.stringify(remoteData));
      memoryDb![key] = remoteData;
    });

    const collectionTransactions = transactionSnapshot.docs.map((entry) => entry.data() as Transaction);
    const collectionAuditLogs = auditSnapshot.docs.map((entry) => entry.data() as AuditLog);
    const migrationComplete = migrationSnapshot.data()?.status === "complete";

    let transactions = collectionTransactions;
    let auditLogs = collectionAuditLogs;

    if (!migrationComplete) {
      transactions = mergeEntityRecords(legacyTransactions, collectionTransactions);
      auditLogs = mergeEntityRecords(legacyAuditLogs, collectionAuditLogs);

      await commitFirestoreOperations([
        ...transactions.map((data) => ({
          collectionName: ENTITY_COLLECTION_NAMES[KEYS.TRANSACTIONS],
          id: data.id,
          data,
        })),
        ...auditLogs.map((data) => ({
          collectionName: ENTITY_COLLECTION_NAMES[KEYS.AUDIT_LOGS],
          id: data.id,
          data,
        })),
      ]);
      await setDoc(
        doc(db, ENTITY_MIGRATION_COLLECTION, ENTITY_MIGRATION_DOCUMENT),
        {
          status: "complete",
          transactionCount: transactions.length,
          auditLogCount: auditLogs.length,
          completedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } else {
      // A completed marker makes the per-record collections authoritative.
      // If a collection is unexpectedly empty, retain the legacy snapshot as a
      // recovery fallback instead of replacing the browser cache with nothing.
      if (transactions.length === 0 && legacyTransactions.length > 0) {
        console.error("Transaction collection is empty after migration; using the legacy recovery snapshot.");
        transactions = legacyTransactions;
      }
      if (auditLogs.length === 0 && legacyAuditLogs.length > 0) {
        console.error("Audit log collection is empty after migration; using the legacy recovery snapshot.");
        auditLogs = legacyAuditLogs;
      }
    }

    preserveUnsyncedLocalRecords(
      localTransactionsBeforeHydration,
      localAuditLogsBeforeHydration,
      transactions,
      auditLogs,
    );
    cacheEntityRecords(KEYS.TRANSACTIONS, transactions);
    cacheEntityRecords(KEYS.AUDIT_LOGS, auditLogs);
    const hydratedAt = new Date().toISOString();
    localStorage.setItem(`${DB_PREFIX}production_hydrated_at`, hydratedAt);
    if (pendingSyncKeys.size === 0) {
      publishDatabaseSyncSnapshot({ status: "saved", lastSyncedAt: hydratedAt, lastError: null });
    }
  } catch (error) {
    // A previously confirmed Firestore snapshot may be used as an offline cache.
    if (!localStorage.getItem(KEYS.COMPANIES)) throw error;
    console.warn("Firestore unavailable; using the last confirmed local cache.", error);
  }
}

const safeSetDoc = async (docRef: any, data: any, options: any) => {
  try {
    await withFirestoreWriteTimeout(setDoc(docRef, data, options));
    localStorage.removeItem("quota_exceeded");
  } catch (error: any) {
    if (error?.code === 'resource-exhausted') {
      localStorage.setItem("quota_exceeded", "true");
      if (!hasNotifiedQuota) {
        hasNotifiedQuota = true;
        toast.error("Database Quota Exceeded", {
          description: "Firebase free tier limit reached. App will run in offline local mode."
        });
      }
      if (db) {
        disableNetwork(db).catch(() => {});
      }
    } else {
      console.error("Firestore setDoc error:", error);
    }
    throw error;
  }
};

const load = <T>(key: string, def: T): T => {
  if (!memoryDb) memoryDb = {};
  if (key in memoryDb) return memoryDb[key];
  const data = localStorage.getItem(key);
  let val = data ? JSON.parse(data) : def;
  
  if (Array.isArray(val)) {
    let changed = false;
    val.forEach((item: any) => {
      if (item && typeof item === 'object') {
        if (item.receiptPath && typeof item.receiptPath === 'string' && item.receiptPath.length > 30000) { item.receiptPath = null; changed = true; }
        if (item.fileUrl && typeof item.fileUrl === 'string' && item.fileUrl.length > 30000) { item.fileUrl = null; changed = true; }
        if (item.proofOfDepositAttachment && typeof item.proofOfDepositAttachment === 'string' && item.proofOfDepositAttachment.length > 30000) { item.proofOfDepositAttachment = null; changed = true; }
        if (Array.isArray(item.proofOfTransferAttachments)) {
          const before = item.proofOfTransferAttachments.length;
          item.proofOfTransferAttachments = item.proofOfTransferAttachments.filter(
            (a: any) => !(a && typeof a.fileUrl === 'string' && a.fileUrl.length > 30000)
          );
          if (item.proofOfTransferAttachments.length !== before) changed = true;
        }
      }
    });
    if (changed) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  }

  memoryDb[key] = val;
  return val;
};

const sanitizeForFirestore = (data: any) => {
  let cleaned = JSON.parse(JSON.stringify(data));
  if (Array.isArray(cleaned)) {
    // 1. Hard limit to drop ridiculously large files
    cleaned.forEach((item: any) => {
      if (item && typeof item === 'object') {
        if (item.receiptPath && typeof item.receiptPath === 'string' && item.receiptPath.length > 50000) item.receiptPath = null;
        if (item.fileUrl && typeof item.fileUrl === 'string' && item.fileUrl.length > 50000) item.fileUrl = null;
        if (item.proofOfDepositAttachment && typeof item.proofOfDepositAttachment === 'string' && item.proofOfDepositAttachment.length > 50000) item.proofOfDepositAttachment = null;
        if (Array.isArray(item.proofOfTransferAttachments)) {
          item.proofOfTransferAttachments = item.proofOfTransferAttachments.filter(
            (a: any) => !(a && typeof a.fileUrl === 'string' && a.fileUrl.length > 50000)
          );
        }
      }
    });

    // 2. Iteratively drop attachments from oldest to newest if the total payload is too large for Firestore
    let size = new Blob([JSON.stringify(cleaned)]).size;
    let indexToClear = 0;
    while (size > 900000 && indexToClear < cleaned.length) {
      const item = cleaned[indexToClear];
      if (item && typeof item === 'object') {
        if (item.receiptPath) item.receiptPath = null;
        if (item.fileUrl) item.fileUrl = null;
        if (item.proofOfDepositAttachment) item.proofOfDepositAttachment = null;
        if (Array.isArray(item.proofOfTransferAttachments)) item.proofOfTransferAttachments = [];
      }
      indexToClear++;
      size = new Blob([JSON.stringify(cleaned)]).size;
    }
  }
  return cleaned;
};

const save = <T>(key: string, val: T, entityChanges?: EntityChangeSet): void => {
  if (!isSeeding) {
    lastLocalWriteTime = Date.now();
  }
  localStorage.setItem(key, JSON.stringify(val));
  if (!memoryDb) memoryDb = {};
  memoryDb[key] = val;
  
  // Defer event dispatch to avoid triggering state updates during render
  setTimeout(() => {
    window.dispatchEvent(new Event("db-update"));
  }, 0);

  if (db && !isSeeding && key !== KEYS.CURRENT_USER_ID && key !== KEYS.SELECTED_COMPANY_ID) {
    if (isEntityCollectionKey(key)) {
      if (entityChanges && !entityChanges.skipRemote) queueEntityChanges(key, entityChanges);
      return;
    }
    scheduleFirestoreWrite(key);
  }
};

const saveSilent = <T>(key: string, val: T, entityChanges?: EntityChangeSet): void => {
  if (!isSeeding) {
    lastLocalWriteTime = Date.now();
  }
  localStorage.setItem(key, JSON.stringify(val));
  if (!memoryDb) memoryDb = {};
  memoryDb[key] = val;

  if (db && !isSeeding && key !== KEYS.CURRENT_USER_ID && key !== KEYS.SELECTED_COMPANY_ID) {
    if (isEntityCollectionKey(key)) {
      if (entityChanges && !entityChanges.skipRemote) queueEntityChanges(key, entityChanges);
      return;
    }
    scheduleFirestoreWrite(key);
  }
};

// Seed Cash Accounts
/* Default account seeding removed. Accounts must be created explicitly by users.
const SEED_CASH_ACCOUNTS: CashAccount[] = [
  // ─── BIGSTOP ────────────────────────────────────────────
  {
    id: "acc-bgs-001",
    companyId: "c-bgs",
    accountType: "Bank",
    bankName: "Security Bank",
    accountName: "Security Bank - Bigstop",
    accountNumber: "0000054663022",
    accountHolder: "HHC Franchise Hub",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "acc-bgs-002",
    companyId: "c-bgs",
    accountType: "E-Wallet",
    bankName: "GCash",
    accountName: "Bigstop GCash",
    accountNumber: "09687912017",
    accountHolder: "Anna Jane Herrera",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "acc-bgs-003",
    companyId: "c-bgs",
    accountType: "Cash on Hand",
    bankName: "",
    accountName: "Cash On Hand - Bigstop",
    accountNumber: "",
    accountHolder: "Bigstop",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  // ─── HERRERA PROPERTY ───────────────────────────────────
  {
    id: "acc-hbp-001",
    companyId: "c-hbp",
    accountType: "Cash on Hand",
    bankName: "",
    accountName: "Cash On Hand - Herrera Property",
    accountNumber: "",
    accountHolder: "Herrera Property",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "acc-hbp-002",
    companyId: "c-hbp",
    accountType: "E-Wallet",
    bankName: "GCash",
    accountName: "Herrera Property GCash",
    accountNumber: "09565937890",
    accountHolder: "Mark Herrera",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  // ─── HHC FRANCHISE HUB ──────────────────────────────────
  {
    id: "acc-frn-001",
    companyId: "c-frn",
    accountType: "Bank",
    bankName: "RCBC",
    accountName: "RCBC - HHC Franchise Hub",
    accountNumber: "0000007591347012",
    accountHolder: "HHC Franchise Hub",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "acc-frn-002",
    companyId: "c-frn",
    accountType: "Cash on Hand",
    bankName: "",
    accountName: "Cash On Hand - HHC Franchise Hub",
    accountNumber: "",
    accountHolder: "HHC Franchise Hub",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  // ─── BLESSCENT ──────────────────────────────────────────
  {
    id: "acc-bls-001",
    companyId: "c-bls",
    accountType: "Bank",
    bankName: "Security Bank",
    accountName: "Security Bank - Blesscent",
    accountNumber: "0000075257037",
    accountHolder: "Blesscent Marketing Corp",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "acc-bls-002",
    companyId: "c-bls",
    accountType: "E-Wallet",
    bankName: "GCash",
    accountName: "Blesscent GCash",
    accountNumber: "09193305412",
    accountHolder: "Mark Herrera",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "acc-bls-003",
    companyId: "c-bls",
    accountType: "Cash on Hand",
    bankName: "",
    accountName: "Cash On Hand - Blesscent",
    accountNumber: "",
    accountHolder: "Blesscent",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  // ─── SCENTIMO ───────────────────────────────────────────
  {
    id: "acc-sct-001",
    companyId: "c-sct",
    accountType: "Bank",
    bankName: "Security Bank",
    accountName: "Security Bank - Scentimo",
    accountNumber: "0000041508572",
    accountHolder: "Scentimo Manufacturing Corp",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "acc-sct-002",
    companyId: "c-sct",
    accountType: "Cash on Hand",
    bankName: "",
    accountName: "Cash On Hand - Scentimo",
    accountNumber: "",
    accountHolder: "Scentimo",
    openingBalance: 0,
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
];
*/

// One-time import supplied in company_payment_accounts.xlsx.
const COMPANY_PAYMENT_ACCOUNTS: CashAccount[] = ([
  { id: "xlsx-bls-bank", companyId: "c-bls", accountType: "Bank", bankName: "Security Bank", accountName: "Security Bank - Blesscent", accountNumber: "0000075257037", accountHolder: "Blesscent", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
  { id: "xlsx-bls-gcash", companyId: "c-bls", accountType: "E-Wallet", bankName: "GCash", accountName: "Blesscent GCash", accountNumber: "09193305412", accountHolder: "Blesscent", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
  { id: "xlsx-bls-cash", companyId: "c-bls", accountType: "Cash on Hand", bankName: "", accountName: "Cash On Hand - Blesscent", accountNumber: "", accountHolder: "Blesscent", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
  { id: "xlsx-bgs-bank", companyId: "c-bgs", accountType: "Bank", bankName: "Security Bank", accountName: "Security Bank - Bigstop", accountNumber: "0000054663022", accountHolder: "Bigstop", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
  { id: "xlsx-bgs-gcash", companyId: "c-bgs", accountType: "E-Wallet", bankName: "GCash", accountName: "Bigstop GCash", accountNumber: "09687912017", accountHolder: "Bigstop", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
  { id: "xlsx-bgs-cash", companyId: "c-bgs", accountType: "Cash on Hand", bankName: "", accountName: "Cash On Hand - Bigstop", accountNumber: "", accountHolder: "Bigstop", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
  { id: "xlsx-sct-bank", companyId: "c-sct", accountType: "Bank", bankName: "Security Bank", accountName: "Security Bank - Scentimo", accountNumber: "0000041508572", accountHolder: "Scentimo", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
  { id: "xlsx-sct-cash", companyId: "c-sct", accountType: "Cash on Hand", bankName: "", accountName: "Cash On Hand - Scentimo", accountNumber: "", accountHolder: "Scentimo", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
  { id: "xlsx-frn-bank", companyId: "c-frn", accountType: "Bank", bankName: "RCBC", accountName: "RCBC - HHC Franchise Hub", accountNumber: "0000007591347012", accountHolder: "HHC Franchise Hub", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
  { id: "xlsx-frn-cash", companyId: "c-frn", accountType: "Cash on Hand", bankName: "", accountName: "Cash On Hand - HHC Franchise Hub", accountNumber: "", accountHolder: "HHC Franchise Hub", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
  { id: "xlsx-hbp-cash", companyId: "c-hbp", accountType: "Cash on Hand", bankName: "", accountName: "Cash On Hand - Herrera Property", accountNumber: "", accountHolder: "Herrera Building Property", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
  { id: "xlsx-hbp-gcash", companyId: "c-hbp", accountType: "E-Wallet", bankName: "GCash", accountName: "Herrera Property GCash", accountNumber: "09565937890", accountHolder: "Herrera Building Property", openingBalance: 0, isActive: true, createdAt: "2026-07-03T00:00:00Z" },
] as Omit<CashAccount, "currentBalance">[]).map(account => ({ ...account, currentBalance: 0 }));

const COMPANY_PAYMENT_ACCOUNTS_IMPORT_KEY = "finance_db_v3_company_payment_accounts_imported_v2";
const SUPPRESS_DEMO_TRANSACTION_SEED_KEY = "finance_db_v3_suppress_demo_transaction_seed";

// Initialize database
export function initDB() {
  if (dbInitialized) return;
  dbInitialized = true;
  isSeeding = true;
  let justSeeded = false;

  if (!IS_PRODUCTION) {
  if (!localStorage.getItem(KEYS.COMPANIES)) {
    justSeeded = true;
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
          type: "cash_out",
          createdAt: "2026-01-01T08:00:00Z",
        });
      });
      DEFAULT_CASH_IN_CATEGORIES.forEach((name) => {
        categories.push({
          id: `cat-in-${catIdCounter++}`,
          companyId: c.id,
          name,
          type: "cash_in",
          createdAt: "2026-01-01T08:00:00Z",
        });
      });
    });
    save(KEYS.CATEGORIES, categories);

    // Initial Seed Transactions
    const transactions: Transaction[] = [];
    save(KEYS.TRANSACTIONS, transactions);

    // Initial Budgets
    const budgets: Budget[] = [];
    save(KEYS.BUDGETS, budgets);

    // Initial Payables
    const payables: Payable[] = [];
    save(KEYS.PAYABLES, payables);

    // Initial Receivables
    const receivables: Receivable[] = [];
    save(KEYS.RECEIVABLES, receivables);

    // Employees
    const employees: Employee[] = [];
    save(KEYS.EMPLOYEES, employees);

    // Audit logs
    const auditLogs: AuditLog[] = [];
    save(KEYS.AUDIT_LOGS, auditLogs);

    // Default selectors
    save(KEYS.CURRENT_USER_ID, "u-mark"); // default to Mark Herrera
    save(KEYS.SELECTED_COMPANY_ID, "c-bls");
  }



  // Ensure only known seed accounts exist (dev-only reconciliation, driven by SEED_PROFILES
  // so it never drifts out of sync with the actual seed list)
  let currentProfiles = load<Profile[]>(KEYS.PROFILES, SEED_PROFILES);
  let profilesChanged = false;

  const validEmails = SEED_PROFILES.map(p => p.email);
  const invalidProfiles = currentProfiles.filter(p => !validEmails.includes(p.email));

  if (invalidProfiles.length > 0) {
    currentProfiles = currentProfiles.filter(p => validEmails.includes(p.email));
    profilesChanged = true;
  }

  SEED_PROFILES.forEach(seed => {
    const existing = currentProfiles.find(p => p.id === seed.id);
    if (!existing) {
      currentProfiles.push({ ...seed, createdAt: new Date().toISOString() });
      profilesChanged = true;
    } else if (existing.isGroupAdmin !== seed.isGroupAdmin && seed.id === "u-accounting") {
      existing.isGroupAdmin = seed.isGroupAdmin;
      profilesChanged = true;
    }
  });

  if (profilesChanged) {
    save(KEYS.PROFILES, currentProfiles);
  }

  // Clean up roles for invalid profiles
  let currentRoles = load<UserCompanyRole[]>(KEYS.ROLES, SEED_ROLES);
  const validUserIds = currentProfiles.map(p => p.id);
  const invalidRoles = currentRoles.filter(r => !validUserIds.includes(r.userId));
  let rolesChanged = false;
  if (invalidRoles.length > 0) {
    save(KEYS.ROLES, currentRoles.filter(r => validUserIds.includes(r.userId)));
    rolesChanged = true;
  }

  // Auto-fix Companies (add any missing SEED companies)
  let currentCompanies = load<Company[]>(KEYS.COMPANIES, []);
  let compsChanged = false;
  SEED_COMPANIES.forEach(seed => {
    if (!currentCompanies.find(c => c.id === seed.id)) {
      currentCompanies.push(seed);
      compsChanged = true;
    }
  });
  // Remove hrp if it exists
  const hasHrp = currentCompanies.some(c => c.id === "c-hrp" || c.name === "HERRERA PROPERTY");
  if (hasHrp) {
    currentCompanies = currentCompanies.filter(c => c.id !== "c-hrp" && c.name !== "HERRERA PROPERTY");
    compsChanged = true;
  }
  if (compsChanged) {
    save(KEYS.COMPANIES, currentCompanies);
  }

  // Auto-fix Categories
  let allCats = load<Category[]>(KEYS.CATEGORIES, []);
  let catsChanged = false;
  currentCompanies.forEach((comp) => {
    const compCats = allCats.filter((c) => c.companyId === comp.id);
    DEFAULT_CASH_IN_CATEGORIES.forEach((name) => {
      if (!compCats.find((c) => c.name === name && c.type === "cash_in")) {
        allCats.push({ id: `cat-in-${Date.now()}-${Math.floor(Math.random() * 1000)}`, companyId: comp.id, name, type: "cash_in", createdAt: new Date().toISOString() });
        catsChanged = true;
      }
    });
    DEFAULT_CASH_OUT_CATEGORIES.forEach((name) => {
      if (!compCats.find((c) => c.name === name && c.type === "cash_out")) {
        allCats.push({ id: `cat-out-${Date.now()}-${Math.floor(Math.random() * 1000)}`, companyId: comp.id, name, type: "cash_out", createdAt: new Date().toISOString() });
        catsChanged = true;
      }
    });
  });
  if (catsChanged) {
    save(KEYS.CATEGORIES, allCats);
  }

  isSeeding = false;

  
  if (
    localStorage.getItem(SUPPRESS_DEMO_TRANSACTION_SEED_KEY) !== "true" &&
    (!localStorage.getItem(KEYS.TRANSACTIONS) || load<Transaction[]>(KEYS.TRANSACTIONS, []).length === 0)
  ) {
    justSeeded = true;
    const mockTxns: Transaction[] = [];
    const accounts = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []);
    const cats = load<Category[]>(KEYS.CATEGORIES, []);
    
    // Create initial capital
    SEED_COMPANIES.forEach(c => {
      const compAccounts = accounts.filter(a => a.companyId === c.id);
      const mainAcc = compAccounts.length > 0 ? compAccounts[0].id : '';
      const inCat = cats.find(cat => cat.companyId === c.id && cat.type === 'cash_in');
      
      if (mainAcc && inCat) {
        mockTxns.push({
          id: `txn-seed-${c.id}-1`,
          companyId: c.id,
          txnDate: new Date().toISOString().split('T')[0],
          type: 'cash_in',
          amount: 500000,
          purpose: 'Initial Capital',
          categoryId: inCat.id,
          cashAccountId: mainAcc,
          paymentMethod: 'bank_transfer',
          transferRef: 'DEP-001',
          responsiblePerson: 'Owner',
          receiptPath: null,
          reversalOf: null,
          status: 'completed',
          encodedBy: 'u-mark',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        mockTxns.push({
          id: `txn-seed-${c.id}-2`,
          companyId: c.id,
          txnDate: new Date().toISOString().split('T')[0],
          type: 'cash_out',
          amount: 15000,
          purpose: 'Office Supplies',
          categoryId: cats.find(cat => cat.companyId === c.id && cat.type === 'cash_out')?.id || '',
          cashAccountId: mainAcc,
          paymentMethod: 'cash',
          transferRef: 'EXP-001',
          responsiblePerson: 'Admin',
          receiptPath: null,
          reversalOf: null,
          status: 'completed',
          encodedBy: 'u-mark',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
    save(KEYS.TRANSACTIONS, mockTxns);
    if (db) {
      import("firebase/firestore").then(({ doc, setDoc }) => {
        setDoc(doc(db, "appData", KEYS.TRANSACTIONS), { data: mockTxns }, { merge: true });
      });
    }
  }

  /* Legacy cash-account auto-seeding removed.
  const existingCashAccounts = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []);
  if (existingCashAccounts.length === 0) {
    save(KEYS.CASH_ACCOUNTS, SEED_CASH_ACCOUNTS);
  } else {
    // Ensure all seed accounts exist (non-destructive merge)
    let cashChanged = false;
    SEED_CASH_ACCOUNTS.forEach(seed => {
      if (!existingCashAccounts.find(a => a.id === seed.id)) {
        existingCashAccounts.push(seed);
        cashChanged = true;
      }
    });
    if (cashChanged) {
      save(KEYS.CASH_ACCOUNTS, existingCashAccounts);
    }
  }
  */

  if (!localStorage.getItem(COMPANY_PAYMENT_ACCOUNTS_IMPORT_KEY)) {
    const existingCashAccounts = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []);
    const importedAccounts = COMPANY_PAYMENT_ACCOUNTS.filter(imported =>
      !existingCashAccounts.some(existing =>
        existing.companyId === imported.companyId &&
        existing.accountName.toLowerCase() === imported.accountName.toLowerCase() &&
        existing.accountNumber === imported.accountNumber
      )
    );

    if (importedAccounts.length > 0) {
      save(KEYS.CASH_ACCOUNTS, [...existingCashAccounts, ...importedAccounts]);
    }
    localStorage.setItem(COMPANY_PAYMENT_ACCOUNTS_IMPORT_KEY, new Date().toISOString());
  }

  // Push local seeding changes to firestore if needed
  if (db && (profilesChanged || rolesChanged || compsChanged || catsChanged)) {
    if (profilesChanged) safeSetDoc(doc(db, "appData", KEYS.PROFILES), { data: JSON.parse(localStorage.getItem(KEYS.PROFILES) || '[]') }, { merge: true });
    if (rolesChanged) safeSetDoc(doc(db, "appData", KEYS.ROLES), { data: JSON.parse(localStorage.getItem(KEYS.ROLES) || '[]') }, { merge: true });
    if (compsChanged) safeSetDoc(doc(db, "appData", KEYS.COMPANIES), { data: JSON.parse(localStorage.getItem(KEYS.COMPANIES) || '[]') }, { merge: true });
    if (catsChanged) safeSetDoc(doc(db, "appData", KEYS.CATEGORIES), { data: JSON.parse(localStorage.getItem(KEYS.CATEGORIES) || '[]') }, { merge: true });
  }
  }

  // Production never creates, repairs, imports, or pushes seed data.
  isSeeding = false;

  // Hook Firebase Realtime Updates
  if (db) {
    import("firebase/firestore").then(({ collection, onSnapshot, getDocs, doc }) => {
      const colRef = collection(db, "appData");
      
      // Do initial fetch to see if data exists
      getDocs(colRef).then((snapshot) => {
         if (snapshot.empty) {
           if (IS_PRODUCTION) {
             console.error("Production Firestore is empty; refusing to upload cached or seed data.");
             return;
           }
           if (justSeeded) {
             // Push existing data up
             Object.values(KEYS).forEach((k) => {
               if (k === KEYS.CURRENT_USER_ID || k === KEYS.SELECTED_COMPANY_ID)
                 return;
               const v = localStorage.getItem(k);
               if (v) {
                  const dRef = doc(db, "appData", k);
                  safeSetDoc(dRef, { data: sanitizeForFirestore(JSON.parse(v)) }, { merge: true });
               }
             });
           } else {
             // If we didn't just seed, and Firebase is empty, it means Firebase was deleted by another client/reset.
             // We should clear our local data and reload to match Firebase's empty state.
             localStorage.clear();
             memoryDb = null;
             window.location.reload();
           }
        }
      });

      onSnapshot(
        colRef,
        (snap) => {
          // Guard against overwriting local storage with older Firestore snapshot values during/after active local writes
          if (Date.now() - lastLocalWriteTime < 2000) {
            return;
          }

          if (localStorage.getItem("quota_exceeded") === "true") {
            return;
          }

          let changed = false;

          snap.docChanges().forEach((change) => {
             const k = change.doc.id;
             if (k === "master" || isEntityCollectionKey(k)) return;
             if (Object.values(KEYS).includes(k)) {
                if (change.type === "added" || change.type === "modified") {
                   const remoteData = change.doc.data().data;
                   if (remoteData) {
                     const lValStr = localStorage.getItem(k);
                     let incomingData = remoteData;
                     if (Array.isArray(remoteData)) {
                       if (lValStr) {
                         try {
                           const localArr = JSON.parse(lValStr);
                           incomingData = Array.isArray(localArr)
                             ? mergeArraysByFreshness(k, localArr, remoteData)
                             : stripTombstonedIds(k, remoteData);
                         } catch {
                           // Malformed local cache — fall back to the remote copy as-is.
                           incomingData = stripTombstonedIds(k, remoteData);
                         }
                       } else {
                         incomingData = stripTombstonedIds(k, remoteData);
                       }
                     }
                     const rValStr = JSON.stringify(incomingData);
                     if (rValStr !== lValStr) {
                       localStorage.setItem(k, rValStr);
                       if (!memoryDb) memoryDb = {};
                       memoryDb[k] = incomingData;
                       changed = true;
                     }
                   }
                } else if (change.type === "removed") {
                   if (localStorage.getItem(k) !== null) {
                     localStorage.removeItem(k);
                     if (memoryDb && memoryDb[k]) {
                       delete memoryDb[k];
                     }
                     changed = true;
                   }
                }
             }
          });

          if (changed) {
            window.dispatchEvent(new Event("db-update"));
          }
        },
        (error: any) => {
          if (error?.code === 'resource-exhausted') {
            if (!hasNotifiedQuota) {
              hasNotifiedQuota = true;
              toast.error("Database Quota Exceeded", {
                description: "Firebase free tier limit reached. App will run in offline local mode."
              });
            }
            if (db) {
              disableNetwork(db).catch(() => {});
            }
          } else {
            console.error("Firestore onSnapshot error:", error);
          }
        }
      );

      ([KEYS.TRANSACTIONS, KEYS.AUDIT_LOGS] as EntityCollectionKey[]).forEach((key) => {
        const entityCollection = collection(db, ENTITY_COLLECTION_NAMES[key]);
        const entitySource = key === KEYS.AUDIT_LOGS
          ? query(entityCollection, orderBy("createdAt", "desc"), firestoreLimit(LOCAL_AUDIT_LOG_LIMIT))
          : entityCollection;
        onSnapshot(
          entitySource,
          (snapshot) => {
            const current = load<EntityRecord[]>(key, []);
            const byId = new Map(current.map((record) => [record.id, record]));
            let changed = false;

            snapshot.docChanges().forEach((change) => {
              const id = change.doc.id;
              if (change.type === "removed") {
                if (byId.delete(id)) changed = true;
                return;
              }

              const incoming = change.doc.data() as EntityRecord;
              const existing = byId.get(id);
              const incomingTime = Date.parse(incoming.updatedAt || incoming.createdAt || "") || 0;
              const existingTime = Date.parse(existing?.updatedAt || existing?.createdAt || "") || 0;
              if (!existing || incomingTime >= existingTime) {
                byId.set(id, incoming);
                changed = true;
              }
            });

            if (changed) {
              cacheEntityRecords(key, Array.from(byId.values()));
              window.dispatchEvent(new Event("db-update"));
            }
          },
          (error) => console.error(`Firestore ${ENTITY_COLLECTION_NAMES[key]} listener error:`, error),
        );
      });
    });
  }
}

// Current selector state helpers
export function getCurrentUser(): Profile {
  initDB();
  const userId = load(KEYS.CURRENT_USER_ID, "u-mark");
  const profiles = load<Profile[]>(KEYS.PROFILES, []);
  return profiles.find((p) => p.id === userId) || profiles[0];
}

export function setCurrentUser(userId: string): void {
  save(KEYS.CURRENT_USER_ID, userId);
  // Auto switch selected company if user has no access to the current one
  const user = getProfiles().find((p) => p.id === userId);
  if (user && !user.isGroupAdmin) {
    const roles = getRoles().filter((r) => r.userId === userId);
    if (roles.length > 0) {
      save(KEYS.SELECTED_COMPANY_ID, roles[0].companyId);
    }
  }
}

export function getSelectedCompanyId(): string {
  return load(KEYS.SELECTED_COMPANY_ID, "c-bls");
}

export function setSelectedCompanyId(companyId: string): void {
  save(KEYS.SELECTED_COMPANY_ID, companyId);
}

// REST GETTERS
export function getCompanies(): Company[] {
  initDB();
  return load<Company[]>(KEYS.COMPANIES, []);
}

export function saveCompany(company: Company): void {
  initDB();
  const companies = load<Company[]>(KEYS.COMPANIES, []);
  const existingIndex = companies.findIndex(c => c.id === company.id);
  if (existingIndex >= 0) {
    companies[existingIndex] = company;
  } else {
    companies.push(company);
  }
  save(KEYS.COMPANIES, companies);
}

export function deleteCompany(companyId: string): void {
  initDB();
  const companies = load<Company[]>(KEYS.COMPANIES, []);
  const updatedCompanies = companies.filter(c => c.id !== companyId);
  save(KEYS.COMPANIES, updatedCompanies);
}

export function getProfiles(): Profile[] {
  initDB();
  return load<Profile[]>(KEYS.PROFILES, []);
}

export function getRoles(): UserCompanyRole[] {
  initDB();
  return load<UserCompanyRole[]>(KEYS.ROLES, []);
}

export function saveProfile(profile: Profile): void {
  initDB();
  const profiles = load<Profile[]>(KEYS.PROFILES, []);
  const updatedProfile = { ...profile, updatedAt: new Date().toISOString() };
  const existingIndex = profiles.findIndex(p => p.id === profile.id);
  if (existingIndex >= 0) {
    profiles[existingIndex] = updatedProfile;
  } else {
    profiles.push(updatedProfile);
  }
  save(KEYS.PROFILES, profiles);
}

export function saveRole(role: UserCompanyRole): void {
  initDB();
  const roles = load<UserCompanyRole[]>(KEYS.ROLES, []);
  const existingIndex = roles.findIndex(r => r.userId === role.userId && r.companyId === role.companyId);
  if (existingIndex >= 0) {
    roles[existingIndex] = role;
  } else {
    roles.push(role);
  }
  save(KEYS.ROLES, roles);
}

export function deleteRole(userId: string, companyId: string): void {
  initDB();
  const roles = load<UserCompanyRole[]>(KEYS.ROLES, []);
  const updatedRoles = roles.filter(r => !(r.userId === userId && r.companyId === companyId));
  save(KEYS.ROLES, updatedRoles);
}

export function getCategories(companyId: string): Category[] {
  initDB();
  const all = load<Category[]>(KEYS.CATEGORIES, []);
  if (companyId === "all") return all;
  return all.filter((c) => c.companyId === companyId);
}

export function getAllCategories(): Category[] {
  initDB();
  return load<Category[]>(KEYS.CATEGORIES, []);
}

// Helper: check role of caller inside specific company
export function getUserRole(
  userId: string,
  companyId: string,
): CompanyRole | null {
  const user = getProfiles().find((p) => p.id === userId);
  if (!user) return null;
  if (isGroupAdmin(userId)) return "owner"; // Treat group admin as highest admin power
  const roleRecord = getRoles().find(
    (r) => r.userId === userId && r.companyId === companyId,
  );
  if (roleRecord) return roleRecord.role;
  if (userId === "u-accounting" || user.email.toLowerCase() === "accounting@herrera.com") return "finance_officer";
  return null;
}

export function isGroupAdmin(userId: string): boolean {
  const user = getProfiles().find((p) => p.id === userId);
  if (!user) return false;
  if (user.isGroupAdmin) return true;
  if (OWNER_EMAILS.includes(user.email.toLowerCase())) return true;
  const hasOwnerRole = getRoles().some((r) => r.userId === userId && r.role === "owner");
  if (hasOwnerRole) return true;
  return false;
}

export function isOwnerAccount(userId: string): boolean {
  const user = getProfiles().find((profile) => profile.id === userId);
  if (!user) return false;
  return OWNER_EMAILS.includes(user.email.toLowerCase());
}

export function isAccountingUser(userId: string): boolean {
  const user = getProfiles().find((p) => p.id === userId);
  if (!user) return false;
  return userId === "u-accounting" || user.email.toLowerCase() === "accounting@herrera.com";
}

export function canAccessCompany(userId: string, companyId: string): boolean {
  return isGroupAdmin(userId) || getUserRole(userId, companyId) !== null;
}

export function canWriteFinance(userId: string, companyId: string): boolean {
  if (isGroupAdmin(userId)) return true;
  const role = getUserRole(userId, companyId);
  return role === "company_admin" || role === "finance_officer";
}

export function canAdminCompany(userId: string, companyId: string): boolean {
  if (isGroupAdmin(userId)) return true;
  const role = getUserRole(userId, companyId);
  return role === "company_admin";
}

export function canManagePayroll(userId: string, companyId: string): boolean {
  return canAdminCompany(userId, companyId);
}

export function canManagePeriodClose(userId: string, companyId: string): boolean {
  const user = getProfiles().find((profile) => profile.id === userId);
  if (!user) return false;
  if (userId === "u-it" || PERIOD_CLOSE_MANAGER_EMAILS.includes(user.email.toLowerCase())) {
    return true;
  }
  return getRoles().some(
    (role) =>
      role.userId === userId &&
      role.role === "owner" &&
      (companyId === "all" || role.companyId === companyId),
  );
}

const createAuditLogRecord = (
  actorId: string,
  companyId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  details: Record<string, any>,
): AuditLog => ({
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    companyId,
    actorId,
    action,
    entity,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  });

// Log audit action
export function writeAuditLog(
  actorId: string,
  companyId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  details: Record<string, any>,
): void {
  const currentLogs = load<AuditLog[]>(KEYS.AUDIT_LOGS, []);
  const newLog = createAuditLogRecord(actorId, companyId, action, entity, entityId, details);
  currentLogs.unshift(newLog); // Put at top
  if (currentLogs.length > LOCAL_AUDIT_LOG_LIMIT) currentLogs.length = LOCAL_AUDIT_LOG_LIMIT;
  save(KEYS.AUDIT_LOGS, currentLogs, { upserts: [newLog] });
}

export function getAuditLogs(
  userId: string,
  companyId: string | null = null,
): AuditLog[] {
  const logs = load<AuditLog[]>(KEYS.AUDIT_LOGS, []);
  const user = getProfiles().find((p) => p.id === userId);
  if (!user) return [];

  // Group Admin can see all
  if (user.isGroupAdmin) {
    if (companyId) return logs.filter((l) => l.companyId === companyId);
    return logs;
  }

  // Company Admin can see their own company audit logs
  const roles = getRoles().filter(
    (r) => r.userId === userId && r.role === "company_admin",
  );
  const allowedCompanyIds = roles.map((r) => r.companyId);

  return logs.filter((log) => {
    if (!log.companyId) return false;
    return allowedCompanyIds.includes(log.companyId);
  });
}

export interface MonthEndChecklistSummary {
  transactionCount: number;
  pendingTransactions: number;
  missingReceipts: number;
  unreconciledBankAccounts: number;
  openPayrollRuns: number;
  openPayables: number;
  openReceivables: number;
  blockingIssues: number;
}

const isPeriodMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const monthFromDate = (value: string) => value.slice(0, 7);

export function getAccountingPeriods(userId: string, companyId: string): AccountingPeriod[] {
  const all = load<AccountingPeriod[]>(KEYS.ACCOUNTING_PERIODS, []);
  return all
    .filter((period) => {
      if (!canAccessCompany(userId, period.companyId)) return false;
      return companyId === "all" || period.companyId === companyId;
    })
    .sort((a, b) => b.periodMonth.localeCompare(a.periodMonth));
}

export function getAccountingPeriod(companyId: string, periodMonth: string): AccountingPeriod | null {
  return load<AccountingPeriod[]>(KEYS.ACCOUNTING_PERIODS, []).find(
    (period) => period.companyId === companyId && period.periodMonth === periodMonth,
  ) || null;
}

export function isAccountingPeriodLocked(companyId: string, date: string): boolean {
  if (!companyId || !date || !isPeriodMonth(monthFromDate(date))) return false;
  const period = getAccountingPeriod(companyId, monthFromDate(date));
  return period?.status === "closed" || period?.status === "reopen_requested";
}

export function getAccountingPeriodLockError(companyId: string, date: string): string | null {
  if (!isAccountingPeriodLocked(companyId, date)) return null;
  return `Period Lock: ${monthFromDate(date)} is closed for this company. Request reopening from an Owner or IT account before changing financial data.`;
}

export function getMonthEndChecklist(companyId: string, periodMonth: string): MonthEndChecklistSummary {
  const transactions = load<Transaction[]>(KEYS.TRANSACTIONS, []).filter(
    (transaction) => transaction.companyId === companyId && monthFromDate(transaction.txnDate) === periodMonth,
  );
  const activeBankAccounts = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []).filter(
    (account) => account.companyId === companyId && account.isActive && account.accountType === "Bank",
  );
  const reconciledAccountIds = new Set(
    load<BankReconciliation[]>(KEYS.BANK_RECONCILIATIONS, [])
      .filter(
        (reconciliation) =>
          reconciliation.companyId === companyId &&
          reconciliation.periodMonth === periodMonth &&
          reconciliation.status === "reconciled",
      )
      .map((reconciliation) => reconciliation.cashAccountId),
  );
  const openPayrollRuns = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []).filter(
    (run) =>
      run.companyId === companyId &&
      monthFromDate(run.periodEnd) === periodMonth &&
      (run.status === "draft" || run.status === "pending_approval"),
  ).length;
  const pendingTransactions = transactions.filter((transaction) => transaction.status === "pending").length;

  return {
    transactionCount: transactions.length,
    pendingTransactions,
    missingReceipts: transactions.filter(
      (transaction) =>
        (transaction.status === "approved" || transaction.status === "completed") &&
        !transaction.receiptPath &&
        !transaction.transferRef,
    ).length,
    unreconciledBankAccounts: activeBankAccounts.filter(
      (account) => !reconciledAccountIds.has(account.id),
    ).length,
    openPayrollRuns,
    openPayables: load<Payable[]>(KEYS.PAYABLES, []).filter(
      (payable) =>
        payable.companyId === companyId &&
        monthFromDate(payable.dueDate) === periodMonth &&
        payable.status !== "paid",
    ).length,
    openReceivables: load<Receivable[]>(KEYS.RECEIVABLES, []).filter(
      (receivable) =>
        receivable.companyId === companyId &&
        monthFromDate(receivable.dueDate) === periodMonth &&
        receivable.status !== "collected",
    ).length,
    blockingIssues: pendingTransactions + openPayrollRuns,
  };
}

export function closeAccountingPeriod(
  userId: string,
  companyId: string,
  periodMonth: string,
  closeNotes: string,
): { error?: string; period?: AccountingPeriod } {
  if (companyId === "all" || !canAccessCompany(userId, companyId)) {
    return { error: "Select a company you can access before closing a period." };
  }
  if (!canManagePeriodClose(userId, companyId)) {
    return { error: "Only Owner and IT accounts can close an accounting period." };
  }
  if (!isPeriodMonth(periodMonth)) {
    return { error: "Select a valid accounting month." };
  }

  const checklist = getMonthEndChecklist(companyId, periodMonth);
  if (checklist.blockingIssues > 0) {
    return {
      error: `Resolve ${checklist.pendingTransactions} pending transaction(s) and ${checklist.openPayrollRuns} open payroll run(s) before closing.`,
    };
  }

  const periods = load<AccountingPeriod[]>(KEYS.ACCOUNTING_PERIODS, []);
  const index = periods.findIndex(
    (period) => period.companyId === companyId && period.periodMonth === periodMonth,
  );
  if (index !== -1 && periods[index].status !== "open") {
    return { error: "This accounting period is already closed or awaiting a reopen decision." };
  }

  const now = new Date().toISOString();
  const period: AccountingPeriod = {
    ...(index === -1
      ? {
          id: `period-${companyId}-${periodMonth}`,
          companyId,
          periodMonth,
          reopenedBy: null,
          reopenedAt: null,
        }
      : periods[index]),
    status: "closed",
    closeNotes: closeNotes.trim() || null,
    closedBy: userId,
    closedAt: now,
    reopenRequestedBy: null,
    reopenRequestedAt: null,
    reopenReason: null,
    updatedAt: now,
  };

  if (index === -1) periods.push(period);
  else periods[index] = period;
  save(KEYS.ACCOUNTING_PERIODS, periods);
  writeAuditLog(userId, companyId, "CLOSE_ACCOUNTING_PERIOD", "accounting_period", period.id, {
    periodMonth,
    closeNotes: period.closeNotes,
    checklist,
  });
  return { period };
}

export function requestAccountingPeriodReopen(
  userId: string,
  companyId: string,
  periodMonth: string,
  reason: string,
): { error?: string; period?: AccountingPeriod } {
  if (!canAccessCompany(userId, companyId)) return { error: "Access denied." };
  if (!reason.trim()) return { error: "A reason is required to request reopening." };

  const periods = load<AccountingPeriod[]>(KEYS.ACCOUNTING_PERIODS, []);
  const index = periods.findIndex(
    (period) => period.companyId === companyId && period.periodMonth === periodMonth,
  );
  if (index === -1 || periods[index].status !== "closed") {
    return { error: "Only a closed period can be submitted for reopening." };
  }

  const now = new Date().toISOString();
  periods[index] = {
    ...periods[index],
    status: "reopen_requested",
    reopenRequestedBy: userId,
    reopenRequestedAt: now,
    reopenReason: reason.trim(),
    updatedAt: now,
  };
  save(KEYS.ACCOUNTING_PERIODS, periods);
  writeAuditLog(userId, companyId, "REQUEST_REOPEN_ACCOUNTING_PERIOD", "accounting_period", periods[index].id, {
    periodMonth,
    reason: reason.trim(),
  });
  return { period: periods[index] };
}

export function approveAccountingPeriodReopen(
  userId: string,
  companyId: string,
  periodMonth: string,
): { error?: string; period?: AccountingPeriod } {
  if (!canManagePeriodClose(userId, companyId)) {
    return { error: "Only Owner and IT accounts can approve reopening a period." };
  }

  const periods = load<AccountingPeriod[]>(KEYS.ACCOUNTING_PERIODS, []);
  const index = periods.findIndex(
    (period) => period.companyId === companyId && period.periodMonth === periodMonth,
  );
  if (index === -1 || periods[index].status !== "reopen_requested") {
    return { error: "No reopen request is awaiting approval for this period." };
  }

  const now = new Date().toISOString();
  periods[index] = {
    ...periods[index],
    status: "open",
    reopenedBy: userId,
    reopenedAt: now,
    updatedAt: now,
  };
  save(KEYS.ACCOUNTING_PERIODS, periods);
  writeAuditLog(userId, companyId, "APPROVE_REOPEN_ACCOUNTING_PERIOD", "accounting_period", periods[index].id, {
    periodMonth,
    requestReason: periods[index].reopenReason,
  });
  return { period: periods[index] };
}

export function rejectAccountingPeriodReopen(
  userId: string,
  companyId: string,
  periodMonth: string,
): { error?: string; period?: AccountingPeriod } {
  if (!canManagePeriodClose(userId, companyId)) {
    return { error: "Only Owner and IT accounts can reject reopening a period." };
  }

  const periods = load<AccountingPeriod[]>(KEYS.ACCOUNTING_PERIODS, []);
  const index = periods.findIndex(
    (period) => period.companyId === companyId && period.periodMonth === periodMonth,
  );
  if (index === -1 || periods[index].status !== "reopen_requested") {
    return { error: "No reopen request is awaiting a decision for this period." };
  }

  periods[index] = {
    ...periods[index],
    status: "closed",
    reopenRequestedBy: null,
    reopenRequestedAt: null,
    reopenReason: null,
    updatedAt: new Date().toISOString(),
  };
  save(KEYS.ACCOUNTING_PERIODS, periods);
  writeAuditLog(userId, companyId, "REJECT_REOPEN_ACCOUNTING_PERIOD", "accounting_period", periods[index].id, {
    periodMonth,
  });
  return { period: periods[index] };
}

// TRANSACTION READ/WRITE (WITH RLS CHECKS MOCKED)
function requireGroupAdmin(userId: string) {
  if (!userId || !isGroupAdmin(userId)) {
    throw new Error("Only a Group Admin can perform this destructive operation.");
  }
}

export async function resetAllData(userId: string) {
  requireGroupAdmin(userId);
  localStorage.clear();
  memoryDb = null;
  dbInitialized = false;
  isSeeding = false;
  
  if (db) {
    try {
      const { doc, writeBatch } = await import("firebase/firestore");
      const batch = writeBatch(db);
      Object.values(KEYS).forEach((k) => {
        if (k === KEYS.CURRENT_USER_ID || k === KEYS.SELECTED_COMPANY_ID) return;
        const docRef = doc(db, "appData", k);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (e: any) {
      if (e?.code === 'resource-exhausted') {
        localStorage.setItem("quota_exceeded", "true");
        if (!hasNotifiedQuota) {
          hasNotifiedQuota = true;
          toast.error("Database Quota Exceeded", {
            description: "Firebase free tier limit reached. App will run in offline local mode."
          });
        }
      } else {
        console.error("Failed to delete from Firestore:", e);
      }
      throw e;
    }
  }
}

export async function emptyDataExceptCashAccounts(userId: string) {
  requireGroupAdmin(userId);
  const keysToEmpty = [
    KEYS.TRANSACTIONS, KEYS.APPROVALS, KEYS.BUDGETS, KEYS.PAYABLES,
    KEYS.RECEIVABLES, KEYS.EMPLOYEES, KEYS.PAYROLL_RUNS, KEYS.PAYROLL_ITEMS,
    KEYS.AUDIT_LOGS, KEYS.BANK_STATEMENT_LINES,
    KEYS.BANK_RECONCILIATIONS, KEYS.RECONCILIATION_MATCHES, KEYS.CASH_CUSTODIANS,
    KEYS.CASH_LEDGER_ENTRIES, KEYS.CASH_COUNTS, KEYS.BANK_DEPOSITS,
    KEYS.FUND_TRANSFERS, KEYS.ATTACHMENTS, KEYS.ACCOUNTING_PERIODS
  ];

  lastLocalWriteTime = Date.now();
  localStorage.setItem(SUPPRESS_DEMO_TRANSACTION_SEED_KEY, "true");
  if (!memoryDb) memoryDb = {};
  
  keysToEmpty.forEach(k => {
    localStorage.setItem(k, JSON.stringify([]));
    memoryDb![k] = [];
  });

  if (db) {
    try {
      const { doc, writeBatch } = await import("firebase/firestore");
      const batch = writeBatch(db);
      
      keysToEmpty.forEach((k) => {
        const docRef = doc(db, "appData", k);
        batch.set(docRef, { data: [] }, { merge: true });
      });

      await batch.commit();
      await clearEntityCollections([KEYS.TRANSACTIONS, KEYS.AUDIT_LOGS]);
    } catch (e: any) {
      if (e?.code !== 'resource-exhausted') {
        console.error("Failed to write to Firestore:", e);
      }
      throw e;
    }
  }
}

export async function emptyDashboardData(userId: string) {
  requireGroupAdmin(userId);
  const keysToEmpty = [
    KEYS.TRANSACTIONS, KEYS.APPROVALS, KEYS.BUDGETS, KEYS.PAYABLES,
    KEYS.RECEIVABLES, KEYS.EMPLOYEES, KEYS.PAYROLL_RUNS, KEYS.PAYROLL_ITEMS,
    KEYS.AUDIT_LOGS, KEYS.CASH_ACCOUNTS, KEYS.BANK_STATEMENT_LINES,
    KEYS.BANK_RECONCILIATIONS, KEYS.RECONCILIATION_MATCHES, KEYS.CASH_CUSTODIANS,
    KEYS.CASH_LEDGER_ENTRIES, KEYS.CASH_COUNTS, KEYS.BANK_DEPOSITS,
    KEYS.FUND_TRANSFERS, KEYS.ATTACHMENTS, KEYS.ACCOUNTING_PERIODS
  ];

  lastLocalWriteTime = Date.now();
  localStorage.setItem(SUPPRESS_DEMO_TRANSACTION_SEED_KEY, "true");
  if (!memoryDb) memoryDb = {};
  
  keysToEmpty.forEach(k => {
    localStorage.setItem(k, JSON.stringify([]));
    memoryDb![k] = [];
  });

  if (db) {
    try {
      const { doc, writeBatch } = await import("firebase/firestore");
      const batch = writeBatch(db);
      keysToEmpty.forEach((k) => {
        const docRef = doc(db, "appData", k);
        batch.set(docRef, { data: [] }, { merge: true });
      });
      await batch.commit();
      await clearEntityCollections([KEYS.TRANSACTIONS, KEYS.AUDIT_LOGS]);
    } catch (e: any) {
      if (e?.code !== 'resource-exhausted') {
        console.error("Failed to write to Firestore:", e);
      }
      throw e;
    }
  }
}

export async function addCategoriesByName(userId: string, entries: { name: string; type: CashflowType }[]): Promise<{ addedCount: number }> {
  requireGroupAdmin(userId);
  const allCats = load<Category[]>(KEYS.CATEGORIES, []);
  const companies = load<Company[]>(KEYS.COMPANIES, []);
  let idCounter = Date.now();
  let addedCount = 0;

  companies.forEach((comp) => {
    entries.forEach(({ name, type }) => {
      const exists = allCats.some(
        (c) => c.companyId === comp.id && c.type === type && c.name.toLowerCase() === name.toLowerCase(),
      );
      if (!exists) {
        allCats.push({
          id: `cat-${type === "cash_in" ? "in" : "out"}-${idCounter++}-${Math.floor(Math.random() * 1000)}`,
          companyId: comp.id,
          name,
          type,
          createdAt: new Date().toISOString(),
        });
        addedCount++;
      }
    });
  });

  if (addedCount === 0) return { addedCount: 0 };

  save(KEYS.CATEGORIES, allCats);

  if (db) {
    try {
      const docRef = doc(db, "appData", KEYS.CATEGORIES);
      await safeSetDoc(docRef, { data: allCats }, { merge: true });
    } catch (e: any) {
      if (e?.code !== 'resource-exhausted') {
        console.error("Failed to write categories to Firestore:", e);
      }
      throw e;
    }
  }

  return { addedCount };
}

export async function removeCategoriesByName(userId: string, names: string[]): Promise<{ removedCount: number }> {
  requireGroupAdmin(userId);
  const lowerNames = names.map((n) => n.toLowerCase());
  const allCats = load<Category[]>(KEYS.CATEGORIES, []);
  const removedIds = allCats.filter((c) => lowerNames.includes(c.name.toLowerCase())).map((c) => c.id);
  const kept = allCats.filter((c) => !lowerNames.includes(c.name.toLowerCase()));
  const removedCount = allCats.length - kept.length;

  if (removedCount === 0) return { removedCount: 0 };

  recordDeletions(KEYS.CATEGORIES, removedIds);
  save(KEYS.CATEGORIES, kept);

  if (db) {
    try {
      const docRef = doc(db, "appData", KEYS.CATEGORIES);
      await safeSetDoc(docRef, { data: kept }, { merge: true });
    } catch (e: any) {
      if (e?.code !== 'resource-exhausted') {
        console.error("Failed to write categories to Firestore:", e);
      }
      throw e;
    }
  }

  return { removedCount };
}

export function getTransactions(
  userId: string,
  companyId: string | null = null,
): Transaction[] {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  if (!userId) return [];

  // Filter based on companies the user is allowed to access
  return allTxns.filter((t) => {
    if (!canAccessCompany(userId, t.companyId)) return false;
    if (companyId && companyId !== "all" && t.companyId !== companyId)
      return false;
    return true;
  });
}

type TransactionInput = Omit<
  Transaction,
  "id" | "status" | "encodedBy" | "createdAt" | "updatedAt"
>;

const validateTransactionInput = (userId: string, data: TransactionInput): string | undefined => {
  // Validate Security Write Privileges
  if (!canWriteFinance(userId, data.companyId)) {
    return "Security Enforcement: Insufficient privileges to encode financial transaction for this company.";
  }

  const periodLockError = getAccountingPeriodLockError(data.companyId, data.txnDate);
  if (periodLockError) return periodLockError;

  // Validate Constraints & Category Match
  const categories = getCategories(data.companyId);
  const matchedCat = categories.find((c) => c.id === data.categoryId);
  if (!matchedCat) {
    return "Database Constraint Error: Category does not exist or does not belong to target company.";
  }
  if (matchedCat.type !== data.type) {
    return "Database Constraint Error: Cashflow type does not match of selected category.";
  }
  if (data.amount <= 0) {
    return "Value range validation error: Financial amounts must be strictly positive.";
  }
  return undefined;
};

const buildPendingTransaction = (
  userId: string,
  data: TransactionInput,
  id = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
): Transaction => {
  const timestamp = new Date().toISOString();
  return {
    ...data,
    id,
    requestedCashAccountId: data.requestedCashAccountId ?? data.cashAccountId,
    status: "pending",
    encodedBy: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

// Encode new Transaction
export function insertTransaction(
  userId: string,
  data: TransactionInput,
): { error?: string; transaction?: Transaction } {
  const validationError = validateTransactionInput(userId, data);
  if (validationError) return { error: validationError };

  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const newTxn = buildPendingTransaction(userId, data);

  allTxns.unshift(newTxn);
  save(KEYS.TRANSACTIONS, allTxns, { upserts: [newTxn] });

  if (newTxn.status === "approved" && newTxn.cashAccountId) {
    saveCashLedgerEntry({
      date: newTxn.txnDate,
      companyId: newTxn.companyId,
      cashAccountId: newTxn.cashAccountId,
      custodianId: null,
      transactionType: newTxn.type === "cash_in" ? "Cash Collection" : "Cash Expense",
      referenceNo: newTxn.id,
      description: newTxn.purpose,
      cashIn: newTxn.type === "cash_in" ? newTxn.amount : 0,
      cashOut: newTxn.type === "cash_out" ? newTxn.amount : 0,
      createdBy: newTxn.encodedBy,
      approvedBy: newTxn.encodedBy
    });
  }

  // Write audit trail
  writeAuditLog(
    userId,
    data.companyId,
    "ENCODE_TRANSACTION",
    "transaction",
    newTxn.id,
    { amount: data.amount, purpose: data.purpose },
  );

  return { transaction: newTxn };
}

export async function insertTransactionsBatch(
  userId: string,
  rows: Array<{ data: TransactionInput; rowNumber: number }>,
  batchId: string,
  onProgress?: (completedRows: number, totalRows: number) => void,
): Promise<{ transactions: Transaction[]; failed: Array<{ rowNumber: number; error: string }> }> {
  const transactions: Transaction[] = [];
  const auditLogs: AuditLog[] = [];
  const failed: Array<{ rowNumber: number; error: string }> = [];

  rows.forEach(({ data, rowNumber }) => {
    const validationError = validateTransactionInput(userId, data);
    if (validationError) {
      failed.push({ rowNumber, error: validationError });
      return;
    }

    const transaction = buildPendingTransaction(
      userId,
      { ...data, importBatchId: batchId, importRowNumber: rowNumber },
      `txn-batch-${batchId}-${rowNumber}`,
    );
    const auditLog = createAuditLogRecord(
      userId,
      data.companyId,
      "ENCODE_TRANSACTION",
      "transaction",
      transaction.id,
      { amount: data.amount, purpose: data.purpose, importBatchId: batchId, importRowNumber: rowNumber },
    );
    auditLog.id = `log-batch-${batchId}-${rowNumber}`;
    transactions.push(transaction);
    auditLogs.push(auditLog);
  });

  if (transactions.length === 0) return { transactions, failed };

  if (db && IS_PRODUCTION) {
    await flushPendingEntityWrites();
    const operations = transactions.flatMap((transaction, index) => [
      {
        collectionName: ENTITY_COLLECTION_NAMES[KEYS.TRANSACTIONS],
        id: transaction.id,
        data: transaction as EntityRecord,
      },
      {
        collectionName: ENTITY_COLLECTION_NAMES[KEYS.AUDIT_LOGS],
        id: auditLogs[index].id,
        data: auditLogs[index] as EntityRecord,
      },
    ]);
    await commitFirestoreOperations(operations, (completed, total) => {
      onProgress?.(Math.min(transactions.length, Math.floor(completed / 2)), Math.floor(total / 2));
    });
    localStorage.removeItem("quota_exceeded");
  }

  const transactionIds = new Set(transactions.map((transaction) => transaction.id));
  const auditIds = new Set(auditLogs.map((entry) => entry.id));
  const currentTransactions = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const currentAuditLogs = load<AuditLog[]>(KEYS.AUDIT_LOGS, []);
  save(
    KEYS.TRANSACTIONS,
    [...transactions, ...currentTransactions.filter((transaction) => !transactionIds.has(transaction.id))],
    { skipRemote: true },
  );
  save(
    KEYS.AUDIT_LOGS,
    [...auditLogs, ...currentAuditLogs.filter((entry) => !auditIds.has(entry.id))]
      .slice(0, LOCAL_AUDIT_LOG_LIMIT),
    { skipRemote: true },
  );
  onProgress?.(transactions.length, transactions.length);
  return { transactions, failed };
}

// Create reversal correction
export function createReversalTransaction(
  userId: string,
  targetTxnId: string,
  currentCompanyId: string,
): { error?: string; transaction?: Transaction } {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const target = allTxns.find((t) => t.id === targetTxnId);

  if (!target) {
    return { error: "Transaction not found for reversal." };
  }

  if (target.companyId !== currentCompanyId) {
    return {
      error:
        "Security breach: Insufficient privileges across multi-tenant boundaries.",
    };
  }

  if (target.status !== "approved") {
    return {
      error: "Only fully approved, finalized transactions can be reversed.",
    };
  }

  // Ensure write permission
  if (!canWriteFinance(userId, target.companyId)) {
    return {
      error:
        "Security Enforcement: Insufficient roles to perform adjustment reversals.",
    };
  }

  const reversalDate = new Date().toISOString().split("T")[0];
  const periodLockError = getAccountingPeriodLockError(target.companyId, reversalDate);
  if (periodLockError) return { error: periodLockError };

  // Create reverse cashflow-type transaction
  const reversalType: CashflowType =
    target.type === "cash_in" ? "cash_out" : "cash_in";

  // Find a generic reversal category or use same
  const newTxn: Transaction = {
    id: `txn-rev-${Date.now()}`,
    companyId: target.companyId,
    txnDate: reversalDate,
    type: reversalType,
    amount: target.amount,
    categoryId: target.categoryId, // Keep the category for accurate variance balancing
    purpose: `REVERSAL OF #${target.id}: Correction for: ${target.purpose}`,
    responsiblePerson: "Financial Adjustment",
    receiptPath: null,
    status: "pending", // Starts as pending approval
    encodedBy: userId,
    reversalOf: target.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allTxns.unshift(newTxn);
  save(KEYS.TRANSACTIONS, allTxns, { upserts: [newTxn] });

  writeAuditLog(
    userId,
    target.companyId,
    "WRITE_REVERSAL_TXN",
    "transaction",
    newTxn.id,
    { targetTxnId, amount: target.amount },
  );

  return { transaction: newTxn };
}

// Reviewing Pending Transaction (RPC: review_transaction)
export function markTransactionCompleted(userId: string, transactionId: string): { error?: string } {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const index = allTxns.findIndex(t => t.id === transactionId);
  if (index === -1) return { error: "Transaction not found" };
  const periodLockError = getAccountingPeriodLockError(allTxns[index].companyId, allTxns[index].txnDate);
  if (periodLockError) return { error: periodLockError };
  
  if (allTxns[index].status !== 'approved') {
    return { error: "Only approved transactions can be marked completed." };
  }

  allTxns[index].status = 'completed';
  allTxns[index].updatedAt = new Date().toISOString();
  save(KEYS.TRANSACTIONS, allTxns, { upserts: [allTxns[index]] });

  writeAuditLog(userId, allTxns[index].companyId, "MARK_COMPLETED", "transaction", transactionId, {});
  return {};
}

export function deleteTransaction(userId: string, transactionId: string): { error?: string } {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const index = allTxns.findIndex(t => t.id === transactionId);
  if (index === -1) return { error: "Transaction not found." };

  const txn = allTxns[index];
  const periodLockError = getAccountingPeriodLockError(txn.companyId, txn.txnDate);
  if (periodLockError) return { error: periodLockError };
  if (!canAdminCompany(userId, txn.companyId)) {
    return { error: "Access Denied: Only a Company Administrator or Group Admin can delete a transaction." };
  }

  allTxns.splice(index, 1);
  recordDeletions(KEYS.TRANSACTIONS, [transactionId]);
  save(KEYS.TRANSACTIONS, allTxns, { deleteIds: [transactionId] });

  const ledgerEntries = load<CashLedgerEntry[]>(KEYS.CASH_LEDGER_ENTRIES, []);
  const removedLedgerIds = ledgerEntries.filter(e => e.referenceNo === transactionId).map(e => e.id);
  const remainingLedgerEntries = ledgerEntries.filter(e => e.referenceNo !== transactionId);
  if (remainingLedgerEntries.length !== ledgerEntries.length) {
    recordDeletions(KEYS.CASH_LEDGER_ENTRIES, removedLedgerIds);
    save(KEYS.CASH_LEDGER_ENTRIES, remainingLedgerEntries);
  }

  const approvals = load<Approval[]>(KEYS.APPROVALS, []);
  const removedApprovalIds = approvals.filter(a => a.transactionId === transactionId).map(a => a.id);
  const remainingApprovals = approvals.filter(a => a.transactionId !== transactionId);
  if (remainingApprovals.length !== approvals.length) {
    recordDeletions(KEYS.APPROVALS, removedApprovalIds);
    save(KEYS.APPROVALS, remainingApprovals);
  }

  if (txn.sourceModule === "ap" && txn.sourceRecordId) {
    const payables = load<Payable[]>(KEYS.PAYABLES, []);
    const payableIndex = payables.findIndex(
      (payable) => payable.id === txn.sourceRecordId,
    );
    if (payableIndex !== -1) {
      payables[payableIndex] = {
        ...payables[payableIndex],
        status: "unpaid",
        paidTransactionId: null,
        updatedAt: new Date().toISOString(),
      };
      save(KEYS.PAYABLES, payables);
    }
  }

  if (txn.sourceModule === "ar" && txn.sourceRecordId) {
    const receivables = load<Receivable[]>(KEYS.RECEIVABLES, []);
    const receivableIndex = receivables.findIndex(
      (receivable) => receivable.id === txn.sourceRecordId,
    );
    if (receivableIndex !== -1) {
      receivables[receivableIndex] = {
        ...receivables[receivableIndex],
        status: "uncollected",
        collectedTransactionId: null,
        updatedAt: new Date().toISOString(),
      };
      save(KEYS.RECEIVABLES, receivables);
    }
  }

  writeAuditLog(userId, txn.companyId, "DELETE_TRANSACTION", "transaction", transactionId, {
    amount: txn.amount,
    purpose: txn.purpose,
    status: txn.status,
  });
  return {};
}

export function reviewTransaction(
  userId: string,
  targetTransactionId: string,
  reviewAction: ApprovalAction,
  reviewRemarks: string | null,
  reviewOptions?: {
    cashAccountId?: string;
    accountChangeReason?: string | null;
  },
): { error?: string; transaction?: Transaction } {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const index = allTxns.findIndex((t) => t.id === targetTransactionId);

  if (index === -1) {
    return { error: "Target transaction not found." };
  }

  const txn = allTxns[index];

  const periodLockError = getAccountingPeriodLockError(txn.companyId, txn.txnDate);
  if (periodLockError) return { error: periodLockError };

  // Rule: Caller must be approver, company_admin or group_admin
  const role = getUserRole(userId, txn.companyId);
  const isApprover =
    role === "approver" || role === "company_admin" || isGroupAdmin(userId);
  if (!isApprover) {
    return {
      error:
        "Access Denied: Only authorized Approvers or Admins can review pending transactions.",
    };
  }

  // Rule: Cannot approve your own encoded transaction
  const allProfiles = load<import("../types").Profile[]>(KEYS.PROFILES, []);
  const currentUser = allProfiles.find(p => p.id === userId);
  const isOwner = currentUser && ["mark@herrera.com", "ryan@herrera.com", "marvin@herrera.com"].includes(currentUser.email);
  
  if (txn.encodedBy === userId && !isOwner) {
    return {
      error:
        "Conflicts of Interest policy: You are strictly forbidden from approving your own encoded transactions.",
    };
  }

  // Rule: Multi-tier Approval Matrix
  // Tier 1: 0 - 10,000 -> approver, finance_officer, company_admin
  // Tier 2: 10,000 - 50,000 -> finance_officer, company_admin
  // Tier 3: >50,000 -> company_admin
  if (!isGroupAdmin(userId)) {
    if (txn.amount > 50000 && role !== "company_admin") {
      return {
        error:
          "Limit Constraint: Tier 3 transactions (>₱50,000) require Company Administrator profile.",
      };
    } else if (txn.amount > 10000 && role === "approver") {
      return {
        error:
          "Limit Constraint: Tier 2 transactions (>₱10,000) require Finance Officer or Company Admin.",
      };
    }
  }

  // Rule: Rejection requires remarks
  if (
    reviewAction === "rejected" &&
    (!reviewRemarks || reviewRemarks.trim() === "")
  ) {
    return {
      error:
        "Review Policy: Rejection remarks are strictly mandatory to provide audited failure reasons.",
    };
  }

  // Rule: Only pending can be reviewed
  if (txn.status !== "pending") {
    return {
      error:
        "Action Blocked: This transaction has already been reviewed to a final state.",
    };
  }
  
  // Rule: A receipt/photo must be attached before a pending transaction can be approved
  if (reviewAction === "approved" && !txn.receiptPath) {
    return {
      error:
        "Receipt Required: Attach a receipt or photo to this transaction before it can be approved.",
    };
  }

  const requestedCashAccountId = txn.requestedCashAccountId ?? txn.cashAccountId ?? null;
  const approvedCashAccountId = reviewOptions?.cashAccountId ?? txn.cashAccountId ?? null;
  const accountChanged =
    reviewAction === "approved" &&
    txn.type === "cash_out" &&
    requestedCashAccountId !== approvedCashAccountId;

  if (reviewAction === "approved" && txn.type === "cash_out") {
    if (!approvedCashAccountId) {
      return {
        error: "Deduction Account Required: Select the cash or bank account that will fund this payment.",
      };
    }

    const acc = getAllCashAccounts().find(a => a.id === approvedCashAccountId);
    if (!acc || !acc.isActive || acc.companyId !== txn.companyId) {
      return {
        error: "Invalid Deduction Account: Select an active account belonging to the transaction company.",
      };
    }

    if (accountChanged && !reviewOptions?.accountChangeReason?.trim()) {
      return {
        error: "Account Change Reason Required: Explain why the approved deduction account differs from the requested account.",
      };
    }

    if (txn.amount > acc.currentBalance) {
      return {
        error: `Insufficient funds in ${acc.accountName}. Available: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(acc.currentBalance)}, Required: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(txn.amount)}`,
      };
    }
  }

  // Update
  txn.requestedCashAccountId = requestedCashAccountId ?? undefined;
  if (reviewAction === "approved" && txn.type === "cash_out") {
    txn.cashAccountId = approvedCashAccountId ?? undefined;
  }
  txn.status = reviewAction === "approved" ? "approved" : "rejected";
  txn.updatedAt = new Date().toISOString();
  allTxns[index] = txn;
  save(KEYS.TRANSACTIONS, allTxns, { upserts: [txn] });

  // Keep the source AP/AR record aligned with the approval result. A payment
  // or collection is only final after the generated cash transaction is
  // approved; rejection reopens the source record for another attempt.
  if (txn.sourceModule === "ap" && txn.sourceRecordId) {
    const payables = load<Payable[]>(KEYS.PAYABLES, []);
    const payableIndex = payables.findIndex(
      (payable) => payable.id === txn.sourceRecordId,
    );
    if (payableIndex !== -1) {
      const payable = payables[payableIndex];
      payable.status =
        reviewAction === "approved" ? "paid" : "unpaid";
      payable.paidTransactionId =
        reviewAction === "approved" ? txn.id : null;
      if (reviewAction === "approved" && txn.cashAccountId) {
        payable.settlementAccountId = txn.cashAccountId;
      }
      payable.updatedAt = new Date().toISOString();
      payables[payableIndex] = payable;
      save(KEYS.PAYABLES, payables);
    }
  }

  if (txn.sourceModule === "ar" && txn.sourceRecordId) {
    const receivables = load<Receivable[]>(KEYS.RECEIVABLES, []);
    const receivableIndex = receivables.findIndex(
      (receivable) => receivable.id === txn.sourceRecordId,
    );
    if (receivableIndex !== -1) {
      const receivable = receivables[receivableIndex];
      receivable.status =
        reviewAction === "approved" ? "collected" : "uncollected";
      receivable.collectedTransactionId =
        reviewAction === "approved" ? txn.id : null;
      receivable.updatedAt = new Date().toISOString();
      receivables[receivableIndex] = receivable;
      save(KEYS.RECEIVABLES, receivables);
    }
  }

  // If approved and has cashAccountId, reflect it in CashLedger
  if (txn.status === "approved" && txn.cashAccountId) {
    saveCashLedgerEntry({
      date: txn.txnDate,
      companyId: txn.companyId,
      cashAccountId: txn.cashAccountId,
      custodianId: null,
      transactionType: txn.type === "cash_in" ? "Cash Collection" : "Cash Expense",
      referenceNo: txn.id,
      description: txn.purpose,
      cashIn: txn.type === "cash_in" ? txn.amount : 0,
      cashOut: txn.type === "cash_out" ? txn.amount : 0,
      createdBy: txn.encodedBy,
      approvedBy: userId
    });
  }

  // Insert into approvals
  const approvals = load<Approval[]>(KEYS.APPROVALS, []);
  const newApproval: Approval = {
    id: `app-${Date.now()}`,
    transactionId: targetTransactionId,
    approverId: userId,
    action: reviewAction,
    remarks: reviewRemarks,
    requestedCashAccountId,
    approvedCashAccountId:
      reviewAction === "approved" ? approvedCashAccountId : null,
    accountChangeReason:
      accountChanged ? reviewOptions?.accountChangeReason?.trim() || null : null,
    createdAt: new Date().toISOString(),
  };
  approvals.push(newApproval);
  save(KEYS.APPROVALS, approvals);

  // Insert audit log
  writeAuditLog(
    userId,
    txn.companyId,
    `REVIEW_${reviewAction.toUpperCase()}`,
    "transaction",
    txn.id,
    {
      remarks: reviewRemarks,
      amount: txn.amount,
      requestedCashAccountId,
      approvedCashAccountId:
        reviewAction === "approved" ? approvedCashAccountId : null,
      accountChangeReason:
        accountChanged ? reviewOptions?.accountChangeReason?.trim() || null : null,
    },
  );

  return { transaction: txn };
}

export function getApprovals(transactionId: string): Approval[] {
  initDB();
  const approvals = load<Approval[]>(KEYS.APPROVALS, []);
  return approvals.filter((a) => a.transactionId === transactionId);
}

// BUDGET READ/WRITE
export function getBudgets(companyId: string, month: string): Budget[] {
  const all = load<Budget[]>(KEYS.BUDGETS, []);
  if (companyId === "all") {
    return all.filter((b) => b.month === month);
  }
  return all.filter((b) => b.companyId === companyId && b.month === month);
}

export function savePlannedBudget(
  userId: string,
  companyId: string,
  categoryId: string,
  month: string,
  plannedAmount: number,
): { error?: string; budget?: Budget } {
  // Only company admin or group admin
  if (!canAdminCompany(userId, companyId)) {
    return {
      error:
        "Access Denied: Only Company Administrators can configure planned budget allocations.",
    };
  }

  if (plannedAmount < 0) {
    return { error: "Invalid range: budget allocations must be non-negative." };
  }

  // standardise month to 1st of month (YYYY-MM-01)
  const dateObj = new Date(month);
  const formattedMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-01`;

  const budgets = load<Budget[]>(KEYS.BUDGETS, []);
  const existingIndex = budgets.findIndex(
    (b) =>
      b.companyId === companyId &&
      b.categoryId === categoryId &&
      b.month === formattedMonth,
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
      updatedAt: new Date().toISOString(),
    };
    budgets.push(resultBudget);
  }

  save(KEYS.BUDGETS, budgets);

  writeAuditLog(userId, companyId, "UPDATE_BUDGET", "budget", resultBudget.id, {
    categoryId,
    month: formattedMonth,
    plannedAmount,
  });

  return { budget: resultBudget };
}

// ACCOUNTS PAYABLE
export function getPayables(userId: string, companyId: string): Payable[] {
  if (companyId === "all") {
    const payables = load<Payable[]>(KEYS.PAYABLES, []);
    return payables.filter((p) => canAccessCompany(userId, p.companyId));
  }
  if (!canAccessCompany(userId, companyId)) return [];
  const payables = load<Payable[]>(KEYS.PAYABLES, []);
  return payables.filter((p) => p.companyId === companyId);
}

export function insertPayable(
  userId: string,
  data: Omit<
    Payable,
    "id" | "status" | "paidTransactionId" | "createdAt" | "updatedAt"
  >,
): { error?: string; payable?: Payable } {
  if (!canWriteFinance(userId, data.companyId)) {
    return {
      error:
        "Access Denied: Insufficient authorization to log new accounts payable liabilities.",
    };
  }

  const periodLockError = getAccountingPeriodLockError(data.companyId, data.dueDate);
  if (periodLockError) return { error: periodLockError };

  const payables = load<Payable[]>(KEYS.PAYABLES, []);
  const newPayable: Payable = {
    ...data,
    id: `pay-${Date.now()}`,
    status: "unpaid",
    paidTransactionId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  payables.push(newPayable);
  save(KEYS.PAYABLES, payables);

  writeAuditLog(
    userId,
    data.companyId,
    "CREATE_PAYABLE",
    "payable",
    newPayable.id,
    { amount: data.amount, payee: data.payee },
  );
  return { payable: newPayable };
}

export function markPayableAsPaid(
  userId: string,
  payableId: string,
  categoryId: string,
  cashAccountId: string,
): { error?: string; payable?: Payable; txn?: Transaction } {
  const payables = load<Payable[]>(KEYS.PAYABLES, []);
  const idx = payables.findIndex((p) => p.id === payableId);
  if (idx === -1) return { error: "Invoice payable not found." };

  const payable = payables[idx];

  // Enforce writing rules
  if (!canWriteFinance(userId, payable.companyId)) {
    return {
      error:
        "Access Denied: You possess insufficient clearance to record disbursements.",
    };
  }

  if (payable.status === "paid") {
    return { error: "Liability already completed." };
  }
  if (payable.status === "payment_pending") {
    return { error: "This liability already has a payment awaiting approval." };
  }

  const account = getCashAccounts(payable.companyId).find(
    (cashAccount) =>
      cashAccount.id === cashAccountId && cashAccount.isActive,
  );
  if (!account) {
    return {
      error:
        "Select an active payment account belonging to the payable company.",
    };
  }

  const category = getCategories(payable.companyId).find(
    (entry) => entry.id === categoryId && entry.type === "cash_out",
  );
  if (!category) {
    return {
      error: "Select a valid cash-out category for this payment.",
    };
  }

  // Create a pending cash out transaction
  const txnRes = insertTransaction(userId, {
    companyId: payable.companyId,
    cashAccountId,
    txnDate: new Date().toISOString().split("T")[0],
    type: "cash_out",
    amount: payable.amount,
    categoryId,
    purpose: `Disbursement to: ${payable.payee} for AP settlement. ref: [${payable.description}]`,
    responsiblePerson: payable.payee,
    receiptPath: payable.receiptPath || null,
    reversalOf: null,
    sourceModule: "ap",
    sourceRecordId: payable.id,
  });

  if (txnRes.error || !txnRes.transaction) {
    return {
      error:
        txnRes.error || "Failed to trigger ledger disbursement transaction",
    };
  }

  payable.status = "payment_pending";
  payable.settlementAccountId = cashAccountId;
  payable.settlementCategoryId = categoryId;
  payable.paidTransactionId = txnRes.transaction.id;
  payable.updatedAt = new Date().toISOString();
  payables[idx] = payable;
  save(KEYS.PAYABLES, payables);

  writeAuditLog(
    userId,
    payable.companyId,
    "PAY_PAYABLE_SETTLEMENT",
    "payable",
    payable.id,
    {
      amount: payable.amount,
      txnId: txnRes.transaction.id,
      cashAccountId,
      state: "payment_pending",
    },
  );

  return { payable, txn: txnRes.transaction };
}

export function deletePayable(
  userId: string,
  payableId: string,
): { error?: string; success?: boolean } {
  const payables = load<Payable[]>(KEYS.PAYABLES, []);
  const idx = payables.findIndex((p) => p.id === payableId);
  if (idx === -1) return { error: "Invoice payable not found." };

  const payable = payables[idx];

  const periodLockError = getAccountingPeriodLockError(payable.companyId, payable.dueDate);
  if (periodLockError) return { error: periodLockError };

  if (!isGroupAdmin(userId)) {
    return {
      error: "Access Denied: Only the owner can delete accounts payable liabilities.",
    };
  }

  if (payable.status !== "unpaid") {
    return {
      error:
        "This liability has an active or completed settlement transaction and cannot be deleted.",
    };
  }

  recordDeletions(KEYS.PAYABLES, [payableId]);
  save(KEYS.PAYABLES, payables.filter((p) => p.id !== payableId));

  writeAuditLog(
    userId,
    payable.companyId,
    "DELETE_PAYABLE",
    "payable",
    payable.id,
    { amount: payable.amount, payee: payable.payee },
  );

  return { success: true };
}

// ACCOUNTS RECEIVABLE
export function getReceivables(
  userId: string,
  companyId: string,
): Receivable[] {
  if (companyId === "all") {
    const receivables = load<Receivable[]>(KEYS.RECEIVABLES, []);
    return receivables.filter((r) => canAccessCompany(userId, r.companyId));
  }
  if (!canAccessCompany(userId, companyId)) return [];
  const receivables = load<Receivable[]>(KEYS.RECEIVABLES, []);
  return receivables.filter((r) => r.companyId === companyId);
}

export function insertReceivable(
  userId: string,
  data: Omit<
    Receivable,
    "id" | "status" | "collectedTransactionId" | "createdAt" | "updatedAt"
  >,
): { error?: string; receivable?: Receivable } {
  if (!canWriteFinance(userId, data.companyId)) {
    return {
      error:
        "Access Denied: Insufficient roles to declare accounts receivable claims.",
    };
  }

  const periodLockError = getAccountingPeriodLockError(data.companyId, data.dueDate);
  if (periodLockError) return { error: periodLockError };

  const receivables = load<Receivable[]>(KEYS.RECEIVABLES, []);
  const newReceivable: Receivable = {
    ...data,
    id: `rec-${Date.now()}`,
    status: "uncollected",
    collectedTransactionId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  receivables.push(newReceivable);
  save(KEYS.RECEIVABLES, receivables);

  writeAuditLog(
    userId,
    data.companyId,
    "CREATE_RECEIVABLE",
    "receivable",
    newReceivable.id,
    { amount: data.amount, payer: data.payer },
  );
  return { receivable: newReceivable };
}

export function markReceivableAsCollected(
  userId: string,
  receivableId: string,
  categoryId: string,
  cashAccountId: string,
): { error?: string; receivable?: Receivable; txn?: Transaction } {
  const receivables = load<Receivable[]>(KEYS.RECEIVABLES, []);
  const idx = receivables.findIndex((r) => r.id === receivableId);
  if (idx === -1) return { error: "Receivable asset not found." };

  const receivable = receivables[idx];

  // Enforce writing rules
  if (!canWriteFinance(userId, receivable.companyId)) {
    return {
      error:
        "Access Denied: You possess insufficient clearance to generate collection assets.",
    };
  }

  if (receivable.status === "collected") {
    return { error: "Asset collections already completed." };
  }

  if (receivable.status === "collection_pending") {
    return { error: "This claim already has a collection awaiting approval." };
  }

  const account = getCashAccounts(receivable.companyId).find(
    (cashAccount) =>
      cashAccount.id === cashAccountId && cashAccount.isActive,
  );
  if (!account) {
    return {
      error:
        "Select an active collection account belonging to the receivable company.",
    };
  }

  const category = getCategories(receivable.companyId).find(
    (entry) => entry.id === categoryId && entry.type === "cash_in",
  );
  if (!category) {
    return {
      error: "Select a valid cash-in category for this collection.",
    };
  }

  // Create pending cash in transaction
  const txnRes = insertTransaction(userId, {
    companyId: receivable.companyId,
    cashAccountId,
    txnDate: new Date().toISOString().split("T")[0],
    type: "cash_in",
    amount: receivable.amount,
    categoryId,
    purpose: `Collection from: ${receivable.payer} for AR settlement. ref: [${receivable.description}]`,
    responsiblePerson: receivable.payer,
    receiptPath: receivable.receiptPath || null,
    reversalOf: null,
    sourceModule: "ar",
    sourceRecordId: receivable.id,
  });

  if (txnRes.error || !txnRes.transaction) {
    return {
      error:
        txnRes.error || "Failed to trigger ledger cash collection transaction",
    };
  }

  receivable.status = "collection_pending";
  receivable.collectionAccountId = cashAccountId;
  receivable.collectionCategoryId = categoryId;
  receivable.collectedTransactionId = txnRes.transaction.id;
  receivable.updatedAt = new Date().toISOString();
  receivables[idx] = receivable;
  save(KEYS.RECEIVABLES, receivables);

  writeAuditLog(
    userId,
    receivable.companyId,
    "COLLECT_RECEIVABLE_SETTLEMENT",
    "receivable",
    receivable.id,
    {
      amount: receivable.amount,
      txnId: txnRes.transaction.id,
      cashAccountId,
      state: "collection_pending",
    },
  );

  return { receivable, txn: txnRes.transaction };
}

export function deleteReceivable(
  userId: string,
  receivableId: string,
): { error?: string; success?: boolean } {
  const receivables = load<Receivable[]>(KEYS.RECEIVABLES, []);
  const idx = receivables.findIndex((r) => r.id === receivableId);
  if (idx === -1) return { error: "Receivable asset not found." };

  const receivable = receivables[idx];

  const periodLockError = getAccountingPeriodLockError(receivable.companyId, receivable.dueDate);
  if (periodLockError) return { error: periodLockError };

  if (!isGroupAdmin(userId)) {
    return {
      error: "Access Denied: Only the owner can delete accounts receivable claims.",
    };
  }

  if (receivable.status !== "uncollected") {
    return {
      error:
        "This claim has an active or completed collection transaction and cannot be deleted.",
    };
  }

  recordDeletions(KEYS.RECEIVABLES, [receivableId]);
  save(KEYS.RECEIVABLES, receivables.filter((r) => r.id !== receivableId));

  writeAuditLog(
    userId,
    receivable.companyId,
    "DELETE_RECEIVABLE",
    "receivable",
    receivable.id,
    { amount: receivable.amount, payer: receivable.payer },
  );

  return { success: true };
}

// EMPLOYEES (ADMINS ONLY CONTROLS)
export function getEmployees(userId: string, companyId: string): Employee[] {
  // Only admins
  if (companyId === "all") {
    const employees = load<Employee[]>(KEYS.EMPLOYEES, []);
    return employees.filter((e) => canAdminCompany(userId, e.companyId));
  }
  if (!canAdminCompany(userId, companyId)) return [];
  const employees = load<Employee[]>(KEYS.EMPLOYEES, []);
  return employees.filter((e) => e.companyId === companyId);
}

export function saveEmployee(
  userId: string,
  data: Omit<Employee, "id" | "createdAt" | "updatedAt"> & { id?: string },
): { error?: string; employee?: Employee } {
  if (!canAdminCompany(userId, data.companyId)) {
    return {
      error:
        "Access Denied: Only Company Administrators can manage employee registers and payroll details.",
    };
  }

  const employees = load<Employee[]>(KEYS.EMPLOYEES, []);

  if (data.id) {
    const idx = employees.findIndex((e) => e.id === data.id);
    if (idx !== -1) {
      employees[idx] = {
        ...employees[idx],
        fullName: data.fullName,
        position: data.position,
        baseSalary: data.baseSalary,
        active: data.active,
        updatedAt: new Date().toISOString(),
      };
      save(KEYS.EMPLOYEES, employees);
      writeAuditLog(
        userId,
        data.companyId,
        "UPDATE_EMPLOYEE",
        "employee",
        data.id,
        { name: data.fullName, salary: data.baseSalary },
      );
      return { employee: employees[idx] };
    }
  }

  const newEmp: Employee = {
    ...data,
    id: `emp-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  employees.push(newEmp);
  save(KEYS.EMPLOYEES, employees);

  writeAuditLog(
    userId,
    data.companyId,
    "CREATE_EMPLOYEE",
    "employee",
    newEmp.id,
    { name: data.fullName, salary: data.baseSalary },
  );
  return { employee: newEmp };
}

// PAYROLL ACTIONS
export function getPayrollRuns(
  userId: string,
  companyId: string,
): PayrollRun[] {
  if (companyId === "all") {
    const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
    return runs.filter((r) => canAdminCompany(userId, r.companyId));
  }
  if (!canAdminCompany(userId, companyId)) return [];
  const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
  return runs.filter((r) => r.companyId === companyId);
}

export function getPayrollItems(userId: string, runId: string): PayrollItem[] {
  const items = load<PayrollItem[]>(KEYS.PAYROLL_ITEMS, []);
  // Verify access of run first
  const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
  const run = runs.find((r) => r.id === runId);
  if (!run || !canAdminCompany(userId, run.companyId)) return [];

  return items.filter((i) => i.payrollRunId === runId);
}

export function createPayrollRun(
  userId: string,
  companyId: string,
  periodStart: string,
  periodEnd: string,
): { error?: string; run?: PayrollRun; items?: PayrollItem[] } {
  if (!canAdminCompany(userId, companyId)) {
    return {
      error:
        "Access Denied: Only Company Administrators can draft new payroll schedules.",
    };
  }

  const periodLockError = getAccountingPeriodLockError(companyId, periodEnd);
  if (periodLockError) return { error: periodLockError };

  if (new Date(periodEnd) < new Date(periodStart)) {
    return {
      error:
        "Date constraint: Period end date must stand superior to the start date.",
    };
  }

  const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
  const items = load<PayrollItem[]>(KEYS.PAYROLL_ITEMS, []);
  const activeEmployees = getEmployees(userId, companyId).filter(
    (e) => e.active,
  );

  if (activeEmployees.length === 0) {
    return {
      error: "Payroll generation aborted: No active employees registered.",
    };
  }

  // Create target run
  const newRun: PayrollRun = {
    id: `run-${Date.now()}`,
    companyId,
    periodStart,
    periodEnd,
    status: "draft",
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createdItems: PayrollItem[] = [];

  activeEmployees.forEach((emp) => {
    // Basic automatic statutory deductions estimates for Philippine context
    const sss = Math.min(emp.baseSalary * 0.045, 1350);
    const philhealth = Math.min((emp.baseSalary * 0.05) / 2, 1600);
    const pagibig = 100.0;
    const tax = Math.max(
      (emp.baseSalary - sss - philhealth - pagibig - 20833) * 0.15,
      0,
    ); // basic estim
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
      updatedAt: new Date().toISOString(),
    };

    createdItems.push(item);
    items.push(item);
  });

  runs.push(newRun);
  save(KEYS.PAYROLL_RUNS, runs);
  save(KEYS.PAYROLL_ITEMS, items);

  writeAuditLog(
    userId,
    companyId,
    "GENERATE_PAYROLL_RUN",
    "payroll_run",
    newRun.id,
    { periodStart, periodEnd },
  );

  return { run: newRun, items: createdItems };
}

// Update single item deduction
export function updatePayrollDeductions(
  userId: string,
  itemId: string,
  deductions: Deductions,
): { error?: string; item?: PayrollItem } {
  const items = load<PayrollItem[]>(KEYS.PAYROLL_ITEMS, []);
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx === -1) return { error: "Payroll registry line not found." };

  const item = items[idx];
  const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
  const run = runs.find((r) => r.id === item.payrollRunId);

  if (!run || !canAdminCompany(userId, run.companyId)) {
    return {
      error:
        "Access Denied: Only administrators can modify active payroll compensation elements.",
    };
  }

  const periodLockError = getAccountingPeriodLockError(run.companyId, run.periodEnd);
  if (periodLockError) return { error: periodLockError };

  if (run.status !== "draft") {
    return {
      error:
        "Audit state lock: Compensation deductions are locked after the run is finalized.",
    };
  }

  // Calculate net
  const totalDeducts =
    deductions.sss +
    deductions.philhealth +
    deductions.pagibig +
    deductions.tax +
    deductions.other;
  const net = item.gross - totalDeducts;
  if (net < 0) {
    return {
      error:
        "Audit failure: deductions are mathematically superior to the gross compensation.",
    };
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
  mode: "per_employee" | "batch",
  categoryId: string, // standard: payroll outbound
): { error?: string; run?: PayrollRun } {
  const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
  const runIdx = runs.findIndex((r) => r.id === runId);
  if (runIdx === -1) return { error: "Payroll schedule not found." };

  const run = runs[runIdx];
  if (!canAdminCompany(userId, run.companyId)) {
    return {
      error:
        "Access Denied: Admin authorization required to trigger bank payout generation.",
    };
  }

  const periodLockError = getAccountingPeriodLockError(run.companyId, run.periodEnd);
  if (periodLockError) return { error: periodLockError };

  if (run.status !== "draft") {
    return { error: "This disbursement run has already been fully processed." };
  }

  const items = load<PayrollItem[]>(KEYS.PAYROLL_ITEMS, []);
  const runItems = items.filter((i) => i.payrollRunId === runId);

  if (runItems.length === 0) {
    return { error: "No payout files located in this register." };
  }

  if (mode === "per_employee") {
    const emps = load<Employee[]>(KEYS.EMPLOYEES, []);
    for (const item of runItems) {
      const empName =
        emps.find((e) => e.id === item.employeeId)?.fullName || "Employee";
      const res = insertTransaction(userId, {
        companyId: run.companyId,
        txnDate: new Date().toISOString().split("T")[0],
        type: "cash_out",
        amount: item.net,
        categoryId,
        purpose: `Payroll payout matching period: [${run.periodStart} to ${run.periodEnd}] of supervisor: ${empName}`,
        responsiblePerson: empName,
        receiptPath: null,
        reversalOf: null,
      });

      if (res.transaction) {
        item.payoutTransactionId = res.transaction.id;
        const itemIdx = items.findIndex((i) => i.id === item.id);
        if (itemIdx !== -1) items[itemIdx] = item;
      }
    }
  } else {
    // Batch Summarised
    const totalNet = runItems.reduce((acc, curr) => acc + curr.net, 0);
    const res = insertTransaction(userId, {
      companyId: run.companyId,
      txnDate: new Date().toISOString().split("T")[0],
      type: "cash_out",
      amount: totalNet,
      categoryId,
      purpose: `CONSOLIDATED Payroll batch payout matching period: [${run.periodStart} to ${run.periodEnd}] - ${runItems.length} heads`,
      responsiblePerson: "Consolidated Bank Remittance",
      receiptPath: null,
      reversalOf: null,
    });

    if (res.transaction) {
      for (const item of runItems) {
        item.payoutTransactionId = res.transaction.id;
        const itemIdx = items.findIndex((i) => i.id === item.id);
        if (itemIdx !== -1) items[itemIdx] = item;
      }
    }
  }

  run.status = "processed";
  run.updatedAt = new Date().toISOString();
  runs[runIdx] = run;

  save(KEYS.PAYROLL_RUNS, runs);
  save(KEYS.PAYROLL_ITEMS, items);

  writeAuditLog(
    userId,
    run.companyId,
    "DISBURSE_PAYROLL_RUN",
    "payroll_run",
    run.id,
    { mode },
  );

  return { run };
}

// CONSOLIDATED AND SPECIFIC REPORT DATA GENERATORS (DAILY BALANCES, PL, VARIANCE)
export function getDailyBalances(
  companyId: string | null = null,
): DailyBalance[] {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []).filter(
    (t) => t.status === "approved",
  );

  const targetCompanies = companyId && companyId !== 'all'
    ? [companyId]
    : getCompanies().map((c) => c.id);
  const result: DailyBalance[] = [];
  const allAccounts = getAllCashAccounts();

  targetCompanies.forEach((compId) => {
    const comTxns = allTxns.filter((t) => t.companyId === compId);
    const companyAccounts = allAccounts.filter(a => a.companyId === compId);
    const startingCapital = companyAccounts.reduce((sum, acc) => sum + (Number(acc.openingBalance) || 0), 0);

    // Aggregate by date
    const dateMap: Record<string, { cashIn: number; cashOut: number }> = {};
    comTxns.forEach((t) => {
      if (!dateMap[t.txnDate]) {
        dateMap[t.txnDate] = { cashIn: 0, cashOut: 0 };
      }
      if (t.type === "cash_in") {
        dateMap[t.txnDate].cashIn += t.amount;
      } else {
        dateMap[t.txnDate].cashOut += t.amount;
      }
    });

    // Sort dates
    const sortedDates = Object.keys(dateMap).sort();

    let cumulativeBalance = startingCapital;
    sortedDates.forEach((date) => {
      const { cashIn, cashOut } = dateMap[date];
      result.push({
        companyId: compId,
        balanceDate: date,
        beginningBalance: cumulativeBalance,
        totalCashIn: cashIn,
        totalCashOut: cashOut,
        endingBalance: cumulativeBalance + cashIn - cashOut,
      });
      cumulativeBalance = cumulativeBalance + cashIn - cashOut;
    });
  });

  return result;
}

export function getBudgetVsActual(companyId: string, month: string) {
  const budgets = getBudgets(companyId, month);
  const txns = load<Transaction[]>(KEYS.TRANSACTIONS, []).filter((t) => {
    const isCompanyMatch =
      companyId === "all" ? true : t.companyId === companyId;
    return (
      isCompanyMatch &&
      t.status === "approved" &&
      t.type === "cash_out" &&
      t.txnDate.startsWith(month.slice(0, 7))
    );
  });

  const categories = getCategories(companyId).filter(
    (c) => c.type === "cash_out",
  );

  return categories.map((cat) => {
    const planned =
      budgets.find((b) => b.categoryId === cat.id)?.plannedAmount || 0;
    const actual = txns
      .filter((t) => t.categoryId === cat.id)
      .reduce((sum, t) => sum + t.amount, 0);
    const variance = planned - actual;
    const usagePercent = planned > 0 ? (actual / planned) * 100 : 0;

    let status = "within_budget";
    if (actual > planned) status = "over_budget";
    else if (usagePercent >= 80) status = "near_limit";

    return {
      companyId: cat.companyId,
      categoryId: cat.id,
      categoryName: cat.name,
      month,
      plannedAmount: planned,
      actualAmount: actual,
      variance,
      usagePercent,
      status,
    };
  });
}

export function getProfitLoss(companyId: string | null = null) {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []).filter(
    (t) => t.status === "approved",
  );
  const targetCompanies = companyId && companyId !== 'all'
    ? [companyId]
    : getCompanies().map((c) => c.id);

  const result: Array<{
    companyId: string;
    companyName: string;
    month: string;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  }> = [];

  targetCompanies.forEach((compId) => {
    const compName =
      getCompanies().find((c) => c.id === compId)?.name || "Unknown";
    const comTxns = allTxns.filter((t) => t.companyId === compId);

    // Group by month
    const monthGroups: Record<string, { rev: number; exp: number }> = {};
    comTxns.forEach((t) => {
      const monthStr = t.txnDate.slice(0, 7); // YYYY-MM
      if (!monthGroups[monthStr]) {
        monthGroups[monthStr] = { rev: 0, exp: 0 };
      }
      if (t.type === "cash_in") {
        monthGroups[monthStr].rev += t.amount;
      } else {
        monthGroups[monthStr].exp += t.amount;
      }
    });

    Object.keys(monthGroups).forEach((month) => {
      const { rev, exp } = monthGroups[month];
      result.push({
        companyId: compId,
        companyName: compName,
        month,
        totalRevenue: rev,
        totalExpenses: exp,
        netIncome: rev - exp,
      });
    });
  });

  return result;
}

export function updateTransactionMetadata(
  userId: string,
  txnId: string,
  metadata: { scanRef: string; timestamp: string; controlNumber?: string },
  receiptPath?: string,
): { error?: string; transaction?: Transaction } {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const idx = allTxns.findIndex((t) => t.id === txnId);
  if (idx === -1) return { error: "Transaction not found." };

  const txn = allTxns[idx];
  if (!canWriteFinance(userId, txn.companyId))
    return { error: "Access Denied." };

  txn.mockMetadata = metadata;
  if (receiptPath !== undefined) {
    txn.receiptPath = receiptPath;
  }
  txn.updatedAt = new Date().toISOString();
  allTxns[idx] = txn;
  save(KEYS.TRANSACTIONS, allTxns, { upserts: [txn] });

  writeAuditLog(
    userId,
    txn.companyId,
    "UPDATE_TXN_METADATA",
    "transaction",
    txnId,
    { scanRef: metadata.scanRef, hasReceipt: !!receiptPath },
  );
  return { transaction: txn };
}

export function attachTransactionReceipt(
  userId: string,
  txnId: string,
  receiptPath: string,
): { error?: string; transaction?: Transaction } {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const idx = allTxns.findIndex((t) => t.id === txnId);
  if (idx === -1) return { error: "Transaction not found." };

  const txn = allTxns[idx];
  const role = getUserRole(userId, txn.companyId);
  const isApprover = role === "approver" || role === "company_admin" || isGroupAdmin(userId);
  if (!isApprover && !canWriteFinance(userId, txn.companyId)) {
    return { error: "Access Denied." };
  }

  txn.receiptPath = receiptPath;
  txn.updatedAt = new Date().toISOString();
  allTxns[idx] = txn;
  save(KEYS.TRANSACTIONS, allTxns, { upserts: [txn] });

  writeAuditLog(userId, txn.companyId, "ATTACH_RECEIPT", "transaction", txnId, {
    hasReceipt: true,
  });
  return { transaction: txn };
}

export function addTransactionAnnotation(
  userId: string,
  txnId: string,
  annotation: Omit<import("../types").Transaction["annotations"][0], "id" | "createdAt" | "authorId">
): { error?: string; transaction?: import("../types").Transaction } {
  const allTxns = load<import("../types").Transaction[]>(KEYS.TRANSACTIONS, []);
  const idx = allTxns.findIndex((t) => t.id === txnId);
  if (idx === -1) return { error: "Transaction not found." };
  const txn = allTxns[idx];

  const newAnnotation = {
    ...annotation,
    id: `ann-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    authorId: userId,
    createdAt: new Date().toISOString()
  };

  if (!txn.annotations) {
    txn.annotations = [];
  }
  txn.annotations.push(newAnnotation);
  txn.updatedAt = new Date().toISOString();
  allTxns[idx] = txn;
  save(KEYS.TRANSACTIONS, allTxns, { upserts: [txn] });

  return { transaction: txn };
}

export function removeTransactionAnnotation(
  userId: string,
  txnId: string,
  annotationId: string
): { error?: string; transaction?: import("../types").Transaction } {
  const allTxns = load<import("../types").Transaction[]>(KEYS.TRANSACTIONS, []);
  const idx = allTxns.findIndex((t) => t.id === txnId);
  if (idx === -1) return { error: "Transaction not found." };
  const txn = allTxns[idx];

  if (!txn.annotations) return { error: "No annotations found." };

  txn.annotations = txn.annotations.filter(a => a.id !== annotationId);
  txn.updatedAt = new Date().toISOString();
  allTxns[idx] = txn;
  save(KEYS.TRANSACTIONS, allTxns, { upserts: [txn] });

  return { transaction: txn };
}

export function canCommentOnTransaction(
  userId: string,
  companyId: string,
): boolean {
  const role = getUserRole(userId, companyId);
  return (
    role === "approver" ||
    role === "company_admin" ||
    role === "finance_officer" ||
    isGroupAdmin(userId) ||
    isAccountingUser(userId)
  );
}

// Approval conversation notes — separate from receipt-pin annotations and
// approval remarks, so approvers and accounting can discuss a transaction
// without changing its approval state.
export function addTransactionNote(
  userId: string,
  txnId: string,
  text: string
): { error?: string; transaction?: Transaction } {
  if (!text || !text.trim()) {
    return { error: "Note text cannot be empty." };
  }

  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const idx = allTxns.findIndex((t) => t.id === txnId);
  if (idx === -1) return { error: "Transaction not found." };
  const txn = allTxns[idx];

  if (!canCommentOnTransaction(userId, txn.companyId)) {
    return {
      error:
        "Access Denied: Only Approvers, Accounting, or Admins can join this conversation.",
    };
  }

  const newNote = {
    id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    text: text.trim(),
    authorId: userId,
    createdAt: new Date().toISOString(),
  };

  if (!txn.notes) txn.notes = [];
  txn.notes.push(newNote);
  txn.updatedAt = new Date().toISOString();
  allTxns[idx] = txn;
  save(KEYS.TRANSACTIONS, allTxns, { upserts: [txn] });

  return { transaction: txn };
}

export function removeTransactionNote(
  userId: string,
  txnId: string,
  noteId: string
): { error?: string; transaction?: Transaction } {
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const idx = allTxns.findIndex((t) => t.id === txnId);
  if (idx === -1) return { error: "Transaction not found." };
  const txn = allTxns[idx];

  if (!txn.notes) return { error: "No notes found." };
  const note = txn.notes.find(n => n.id === noteId);
  if (!note) return { error: "Note not found." };
  if (note.authorId !== userId) {
    return { error: "Access Denied: You can only delete your own notes." };
  }

  txn.notes = txn.notes.filter(n => n.id !== noteId);
  txn.updatedAt = new Date().toISOString();
  allTxns[idx] = txn;
  save(KEYS.TRANSACTIONS, allTxns, { upserts: [txn] });

  return { transaction: txn };
}

export function updatePayrollRunMetadata(
  userId: string,
  runId: string,
  metadata: { scanRef: string; timestamp: string },
): { error?: string; run?: PayrollRun } {
  const runs = load<PayrollRun[]>(KEYS.PAYROLL_RUNS, []);
  const idx = runs.findIndex((r) => r.id === runId);
  if (idx === -1) return { error: "Payroll run not found." };

  const run = runs[idx];
  if (!canAdminCompany(userId, run.companyId))
    return { error: "Access Denied." };

  run.mockMetadata = metadata;
  run.updatedAt = new Date().toISOString();
  runs[idx] = run;
  save(KEYS.PAYROLL_RUNS, runs);

  writeAuditLog(
    userId,
    run.companyId,
    "UPDATE_PAYROLL_METADATA",
    "payroll_run",
    runId,
    { scanRef: metadata.scanRef },
  );
  return { run };
}

let sqlAttachments: Record<string, import("../types").Attachment[]> = {};
let sqlAttachmentsFetched: Record<string, boolean> = {};

export function getAttachments(companyId: string): import("../types").Attachment[] {
  initDB();
  const fetchKey = companyId || 'ALL';
  
  if (!sqlAttachmentsFetched[fetchKey]) {
    sqlAttachmentsFetched[fetchKey] = true;
    const url = companyId ? `/api/attachments/${companyId}` : `/api/attachments`;
    fetch(url).then(r => r.json()).then(data => {
      sqlAttachments[fetchKey] = data;
      window.dispatchEvent(new Event("db-update"));
    }).catch(e => {
       console.error("Failed to fetch attachments", e);
       sqlAttachmentsFetched[fetchKey] = false;
    });
  }
  
  return sqlAttachments[fetchKey] || [];
}

export function saveAttachment(
  userId: string,
  companyId: string,
  payload: Omit<import("../types").Attachment, "id" | "companyId" | "uploadedBy" | "createdAt">
): { error?: string; attachment?: import("../types").Attachment } {
  initDB();
  
  if (!canWriteFinance(userId, companyId) && !canAdminCompany(userId, companyId)) {
    return { error: "Access Denied." };
  }

  const attachment: import("../types").Attachment = {
    id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    companyId,
    uploadedBy: userId,
    createdAt: new Date().toISOString(),
    ...payload
  };

  fetch(`/api/attachments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attachment)
  }).then(r => r.json()).then(() => {
     window.dispatchEvent(new Event("db-update"));
  });

  const fetchKey = companyId;
  if (!sqlAttachments[fetchKey]) sqlAttachments[fetchKey] = [];
  sqlAttachments[fetchKey].push(attachment);
  
  if (sqlAttachments['ALL']) {
    sqlAttachments['ALL'].push(attachment);
  }

  writeAuditLog(userId, companyId, "UPLOAD_ATTACHMENT", "attachment", attachment.id, { fileName: attachment.fileName });

  return { attachment };
}

// ----------------------------------------------------------------------------
// CASH ACCOUNTS & BANK RECONCILIATION
// ----------------------------------------------------------------------------

import { CashAccount, BankStatementLine, BankReconciliation, ReconciliationMatch, CashCustodian, CashLedgerEntry, CashCount, BankDeposit } from "../types";

export function calculateCashAccountBalances(
  accounts: CashAccount[],
  transactions: Transaction[],
): CashAccount[] {
  const postedTransactions = transactions.filter(
    (transaction) =>
      transaction.status === "approved" || transaction.status === "completed",
  );

  return accounts.map((account) => {
    const currentBalance = postedTransactions.reduce((balance, transaction) => {
      if (transaction.cashAccountId !== account.id) return balance;
      return transaction.type === "cash_in"
        ? balance + transaction.amount
        : balance - transaction.amount;
    }, account.openingBalance ?? 0);

    return { ...account, currentBalance };
  });
}

export function getCashAccounts(companyId: string): CashAccount[] {
  initDB();
  let all = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []);
  
  // FIX: Removed dangerous empty-array auto-save that was wiping Firestore data
  // when a new browser/device opened the app with no local cash account data.
  // We now simply load what exists – if nothing exists, return empty array safely.

  // Recalculate balances dynamically from APPROVED + COMPLETED transactions
  // (using both statuses so approved transactions are reflected immediately)
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  all = calculateCashAccountBalances(all, allTxns);

  if (!companyId || companyId === "all") return all;
  return all.filter(a => a.companyId === companyId);
}

export function getAllCashAccounts(): CashAccount[] {
  initDB();
  let all = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []);

  // Recalculate balances dynamically from APPROVED + COMPLETED transactions
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  all = calculateCashAccountBalances(all, allTxns);

  return all;
}

export function saveCashAccount(
  userId: string,
  companyId: string,
  payload: any,
  accountId?: string
): { error?: string; account?: CashAccount } {
  initDB();

  const all = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []);

  if (accountId) {
    const idx = all.findIndex((a) => a.id === accountId);
    if (idx === -1) return { error: "Account not found." };

    all[idx] = { ...all[idx], ...payload, companyId: payload.companyId || companyId };
    save(KEYS.CASH_ACCOUNTS, all);
    writeAuditLog(userId, payload.companyId || companyId, "UPDATE_CASH_ACCOUNT", "cash_account", accountId, { name: payload.accountName });
    return { account: all[idx] };
  } else {
    const account: CashAccount = {
      id: `acc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId: payload.companyId || companyId,
      isActive: true,
      createdAt: new Date().toISOString(),
      ...payload,
    };
    all.push(account);
    save(KEYS.CASH_ACCOUNTS, all);
    writeAuditLog(userId, payload.companyId || companyId, "CREATE_CASH_ACCOUNT", "cash_account", account.id, { name: payload.accountName });
    return { account };
  }
}

export function deleteCashAccount(userId: string, companyId: string, accountId: string): { error?: string } {
  initDB();
  const all = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []);
  const idx = all.findIndex((a) => a.id === accountId);
  if (idx === -1) return { error: "Account not found." };
  
  const accountName = all[idx].accountName;
  all.splice(idx, 1);
  recordDeletions(KEYS.CASH_ACCOUNTS, [accountId]);
  save(KEYS.CASH_ACCOUNTS, all);
  writeAuditLog(userId, companyId, "DELETE_CASH_ACCOUNT", "cash_account", accountId, { name: accountName });
  return {};
}

export function getBankReconciliations(companyId: string): BankReconciliation[] {
  initDB();
  const all = load<BankReconciliation[]>(KEYS.BANK_RECONCILIATIONS, []);
  return all.filter((r) => r.companyId === companyId);
}

export function saveBankReconciliation(
  userId: string,
  companyId: string,
  payload: Omit<BankReconciliation, "id" | "companyId" | "createdAt" | "preparedBy">,
  reconciliationId?: string
): { error?: string; reconciliation?: BankReconciliation } {
  initDB();
  if (!canWriteFinance(userId, companyId)) {
    return { error: "Access Denied." };
  }

  const periodLockError = getAccountingPeriodLockError(companyId, `${payload.periodMonth}-01`);
  if (periodLockError) return { error: periodLockError };

  const all = load<BankReconciliation[]>(KEYS.BANK_RECONCILIATIONS, []);

  if (reconciliationId) {
    const idx = all.findIndex((r) => r.id === reconciliationId);
    if (idx === -1) return { error: "Reconciliation not found." };
    all[idx] = { ...all[idx], ...payload };
    save(KEYS.BANK_RECONCILIATIONS, all);
    writeAuditLog(userId, companyId, "UPDATE_RECONCILIATION", "bank_reconciliation", reconciliationId, { status: payload.status });
    return { reconciliation: all[idx] };
  } else {
    const rec: BankReconciliation = {
      id: `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId,
      preparedBy: userId,
      createdAt: new Date().toISOString(),
      ...payload,
    };
    all.push(rec);
    save(KEYS.BANK_RECONCILIATIONS, all);
    writeAuditLog(userId, companyId, "CREATE_RECONCILIATION", "bank_reconciliation", rec.id, { period: payload.periodMonth });
    return { reconciliation: rec };
  }
}

export function getBankStatementLines(cashAccountId: string): BankStatementLine[] {
  initDB();
  const all = load<BankStatementLine[]>(KEYS.BANK_STATEMENT_LINES, []);
  return all.filter((r) => r.cashAccountId === cashAccountId);
}

export function saveBankStatementLines(
  userId: string,
  cashAccountId: string,
  lines: Omit<BankStatementLine, "id" | "createdAt">[]
): { error?: string } {
  initDB();
  const account = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []).find(
    (entry) => entry.id === cashAccountId,
  );
  if (!account || !canWriteFinance(userId, account.companyId)) return { error: "Access Denied." };
  const lockedLine = lines.find((line) => isAccountingPeriodLocked(account.companyId, line.statementDate));
  if (lockedLine) {
    return { error: getAccountingPeriodLockError(account.companyId, lockedLine.statementDate) || undefined };
  }
  const all = load<BankStatementLine[]>(KEYS.BANK_STATEMENT_LINES, []);
  
  const newLines = lines.map(line => ({
    ...line,
    id: `bsl-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    createdAt: new Date().toISOString(),
  }));

  all.push(...newLines);
  save(KEYS.BANK_STATEMENT_LINES, all);
  return {};
}

export function getReconciliationMatches(reconciliationId: string): ReconciliationMatch[] {
  initDB();
  const all = load<ReconciliationMatch[]>(KEYS.RECONCILIATION_MATCHES, []);
  return all.filter((r) => r.reconciliationId === reconciliationId);
}

export function saveReconciliationMatch(
  userId: string,
  match: Omit<ReconciliationMatch, "id" | "createdAt">
): { error?: string; match?: ReconciliationMatch } {
  initDB();
  const reconciliation = load<BankReconciliation[]>(KEYS.BANK_RECONCILIATIONS, []).find(
    (entry) => entry.id === match.reconciliationId,
  );
  if (!reconciliation || !canWriteFinance(userId, reconciliation.companyId)) {
    return { error: "Access Denied." };
  }
  const periodLockError = getAccountingPeriodLockError(
    reconciliation.companyId,
    `${reconciliation.periodMonth}-01`,
  );
  if (periodLockError) return { error: periodLockError };
  const all = load<ReconciliationMatch[]>(KEYS.RECONCILIATION_MATCHES, []);
  
  const newMatch: ReconciliationMatch = {
    ...match,
    id: `rm-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    createdAt: new Date().toISOString(),
  };

  all.push(newMatch);
  save(KEYS.RECONCILIATION_MATCHES, all);
  return { match: newMatch };
}

export function getCashCustodians(companyId: string): CashCustodian[] {
  initDB();
  const all = load<CashCustodian[]>(KEYS.CASH_CUSTODIANS, []);
  if (!companyId || companyId === "all") return all;
  return all.filter(c => c.companyId === companyId);
}

export function saveCashCustodian(payload: Omit<CashCustodian, "id" | "createdAt" | "isActive">, id?: string) {
  initDB();
  const all = load<CashCustodian[]>(KEYS.CASH_CUSTODIANS, []);
  if (id) {
    const idx = all.findIndex(a => a.id === id);
    if (idx > -1) {
      all[idx] = { ...all[idx], ...payload } as CashCustodian;
    } else {
      all.push({
        ...payload,
        id,
        isActive: true,
        createdAt: new Date().toISOString()
      } as CashCustodian);
    }
  } else {
    all.push({
      ...payload,
      id: `CUST-${Date.now()}`,
      isActive: true,
      createdAt: new Date().toISOString()
    } as CashCustodian);
  }
  save(KEYS.CASH_CUSTODIANS, all);
  return { success: true };
}

export function getCashLedgerEntries(companyId: string): CashLedgerEntry[] {
  initDB();
  const all = load<CashLedgerEntry[]>(KEYS.CASH_LEDGER_ENTRIES, []);
  if (!companyId || companyId === 'all') return all;
  return all.filter(e => e.companyId === companyId);
}

export function saveCashLedgerEntry(
  payload: Omit<CashLedgerEntry, "id" | "createdAt" | "runningBalance">,
): { success: boolean; error?: string } {
  initDB();
  const periodLockError = getAccountingPeriodLockError(payload.companyId, payload.date);
  if (periodLockError) return { success: false, error: periodLockError };
  const all = load<CashLedgerEntry[]>(KEYS.CASH_LEDGER_ENTRIES, []);
  const entriesForAccount = all.filter(e => e.cashAccountId === payload.cashAccountId);
  
  const lastBalance = entriesForAccount.length > 0 ? entriesForAccount[entriesForAccount.length - 1].runningBalance : 0;
  
  let runningBalance = lastBalance;
  if (entriesForAccount.length === 0) {
     const accs = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []);
     const acc = accs.find(a => a.id === payload.cashAccountId);
     if (acc) {
       runningBalance = acc.openingBalance;
     }
  }
  
  runningBalance = runningBalance + payload.cashIn - payload.cashOut;
  
  const newEntry: CashLedgerEntry = {
    ...payload,
    id: `LEDG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    runningBalance,
    createdAt: new Date().toISOString()
  };
  
  all.push(newEntry);
  save(KEYS.CASH_LEDGER_ENTRIES, all);
  
  const accs = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []);
  const accIdx = accs.findIndex(a => a.id === payload.cashAccountId);
  if (accIdx > -1) {
    accs[accIdx].currentBalance = runningBalance;
    save(KEYS.CASH_ACCOUNTS, accs);
  }
  
  return { success: true };
}

export function getCashCounts(companyId: string): CashCount[] {
  initDB();
  const all = load<CashCount[]>(KEYS.CASH_COUNTS, []);
  return all.filter(c => c.companyId === companyId);
}

export function saveCashCount(payload: Omit<CashCount, "id" | "createdAt">, id?: string) {
  initDB();
  const periodLockError = getAccountingPeriodLockError(payload.companyId, payload.countDate);
  if (periodLockError) return { success: false, error: periodLockError };
  const all = load<CashCount[]>(KEYS.CASH_COUNTS, []);
  if (id) {
    const idx = all.findIndex(a => a.id === id);
    if (idx > -1) {
      all[idx] = { ...all[idx], ...payload } as CashCount;
    } else {
      all.push({
        ...payload,
        id,
        createdAt: new Date().toISOString()
      } as CashCount);
    }
  } else {
    all.push({
      ...payload,
      id: `CC-${Date.now()}`,
      createdAt: new Date().toISOString()
    } as CashCount);
  }
  save(KEYS.CASH_COUNTS, all);
  return { success: true };
}

export function getBankDeposits(companyId: string): BankDeposit[] {
  initDB();
  const all = load<BankDeposit[]>(KEYS.BANK_DEPOSITS, []);
  return all.filter(d => d.companyId === companyId);
}

export function saveBankDeposit(payload: Omit<BankDeposit, "id" | "createdAt">, id?: string) {
  initDB();
  const sourceAccount = load<CashAccount[]>(KEYS.CASH_ACCOUNTS, []).find(
    (account) => account.id === payload.fromCashAccountId,
  );
  if (sourceAccount) {
    const periodLockError = getAccountingPeriodLockError(sourceAccount.companyId, payload.depositDate);
    if (periodLockError) return { success: false, error: periodLockError };
  }
  const all = load<BankDeposit[]>(KEYS.BANK_DEPOSITS, []);
  if (id) {
    const idx = all.findIndex(a => a.id === id);
    if (idx > -1) {
      all[idx] = { ...all[idx], ...payload } as BankDeposit;
    } else {
      all.push({
        ...payload,
        id,
        createdAt: new Date().toISOString()
      } as BankDeposit);
    }
  } else {
    all.push({
      ...payload,
      id: `BD-${Date.now()}`,
      createdAt: new Date().toISOString()
    } as BankDeposit);
  }
  save(KEYS.BANK_DEPOSITS, all);
  return { success: true };
}

export function getFundTransfers(companyId: string): FundTransfer[] {
  initDB();
  const all = load<FundTransfer[]>(KEYS.FUND_TRANSFERS, []);
  if (!companyId || companyId === 'all') return all;
  return all.filter(t => t.fromCompanyId === companyId || t.toCompanyId === companyId);
}

export function executeFundTransferToLedger(
  userId: string,
  transfer: FundTransfer,
): { success: boolean; alreadyPosted?: boolean; error?: string } {
  initDB();
  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);

  const postedOut = allTxns.some(
    t => t.transferRef === transfer.id && t.type === 'cash_out',
  );
  const postedIn = allTxns.some(
    t => t.transferRef === transfer.id && t.type === 'cash_in',
  );

  const accounts = getAllCashAccounts();
  const source = accounts.find(a => a.id === transfer.fromAccountId);
  const destination = accounts.find(a => a.id === transfer.toAccountId);

  if (!source || !destination) {
    return { success: false, error: 'Source or destination cash account no longer exists.' };
  }
  if (source.id === destination.id) {
    return { success: false, error: 'Source and destination accounts must be different.' };
  }
  if (!Number.isFinite(transfer.amount) || transfer.amount <= 0) {
    return { success: false, error: 'Transfer amount must be greater than zero.' };
  }
  // Approval already let this through despite low funds (see: allow cash-out transactions
  // to reach approval queue despite low balance); completion must not get stuck behind
  // the same check, so an underfunded transfer is allowed to post and the account may go negative.

  const now = new Date().toISOString();
  const txnDate = now.split('T')[0];
  const sourcePeriodLockError = getAccountingPeriodLockError(transfer.fromCompanyId, txnDate);
  if (sourcePeriodLockError) return { success: false, error: sourcePeriodLockError };
  const destinationPeriodLockError = getAccountingPeriodLockError(transfer.toCompanyId, txnDate);
  if (destinationPeriodLockError) return { success: false, error: destinationPeriodLockError };
  const destinationCategories = getAllCategories().filter(
    category => category.companyId === transfer.toCompanyId && category.type === 'cash_in',
  );
  const receivedAs = transfer.receivedAs ?? 'sales';
  const destinationCategory = destinationCategories.find(category =>
    receivedAs === 'capital'
      ? category.name.toLowerCase().includes('capital')
      : category.name.toLowerCase().includes('sales'),
  );

  const newTransactions: Transaction[] = [];

  // OUTFLOW
  if (!postedOut) newTransactions.push({
    id: `txn-${transfer.id}-out`,
    companyId: transfer.fromCompanyId,
    cashAccountId: transfer.fromAccountId,
    txnDate,
    type: 'cash_out',
    amount: transfer.amount,
    categoryId: 'transfer-out',
    purpose: `Transfer out: ${transfer.purpose}`,
    responsiblePerson: userId,
    receiptPath: null,
    status: 'completed', // completed means money moved
    encodedBy: userId,
    reversalOf: null,
    transferRef: transfer.id,
    createdAt: now,
    updatedAt: now
  });

  // INFLOW
  if (!postedIn) newTransactions.push({
    id: `txn-${transfer.id}-in`,
    companyId: transfer.toCompanyId,
    cashAccountId: transfer.toAccountId,
    txnDate,
    type: 'cash_in',
    amount: transfer.amount,
    categoryId: destinationCategory?.id || 'transfer-in',
    purpose: `Transfer in (${receivedAs === 'capital' ? 'Capital' : 'Sales'}): ${transfer.purpose}`,
    responsiblePerson: userId,
    receiptPath: null,
    status: 'completed', // completed means money moved
    encodedBy: userId,
    reversalOf: null,
    transferRef: transfer.id,
    createdAt: now,
    updatedAt: now
  });

  if (newTransactions.length > 0) {
    allTxns.push(...newTransactions);
    save(KEYS.TRANSACTIONS, allTxns, { upserts: newTransactions });
  }

  const ledgerEntries = load<CashLedgerEntry[]>(KEYS.CASH_LEDGER_ENTRIES, []);
  const hasSourceLedgerEntry = ledgerEntries.some(
    e => e.referenceNo === transfer.id && e.cashAccountId === transfer.fromAccountId,
  );
  const hasDestinationLedgerEntry = ledgerEntries.some(
    e => e.referenceNo === transfer.id && e.cashAccountId === transfer.toAccountId,
  );

  if (!hasSourceLedgerEntry) {
    saveCashLedgerEntry({
      date: txnDate,
      companyId: transfer.fromCompanyId,
      cashAccountId: transfer.fromAccountId,
      custodianId: null,
      transactionType: 'Cash Transfer',
      referenceNo: transfer.id,
      description: `Transfer to ${destination.accountName}: ${transfer.purpose}`,
      cashIn: 0,
      cashOut: transfer.amount,
      createdBy: userId,
      approvedBy: transfer.approvedBy ?? userId,
    });
  }
  if (!hasDestinationLedgerEntry) {
    saveCashLedgerEntry({
      date: txnDate,
      companyId: transfer.toCompanyId,
      cashAccountId: transfer.toAccountId,
      custodianId: null,
      transactionType: 'Cash Transfer',
      referenceNo: transfer.id,
      description: `Transfer from ${source.accountName}: ${transfer.purpose}`,
      cashIn: transfer.amount,
      cashOut: 0,
      createdBy: userId,
      approvedBy: transfer.approvedBy ?? userId,
    });
  }

  return { success: true, alreadyPosted: postedOut && postedIn };
}

export function deleteFundTransfer(userId: string, companyId: string, transferId: string): { error?: string } {
  initDB();
  const all = load<FundTransfer[]>(KEYS.FUND_TRANSFERS, []);
  const idx = all.findIndex(t => t.id === transferId);
  if (idx === -1) return { error: "Transfer not found." };

  const removed = all[idx];
  const relatedTransactions = load<Transaction[]>(KEYS.TRANSACTIONS, []).filter(
    (transaction) => transaction.transferRef === transferId,
  );
  const lockedTransaction = relatedTransactions.find((transaction) =>
    isAccountingPeriodLocked(transaction.companyId, transaction.txnDate),
  );
  if (lockedTransaction) {
    return { error: getAccountingPeriodLockError(lockedTransaction.companyId, lockedTransaction.txnDate) || undefined };
  }
  const requestDateLockError = getAccountingPeriodLockError(removed.fromCompanyId, removed.requestDate);
  if (requestDateLockError) return { error: requestDateLockError };
  all.splice(idx, 1);
  recordDeletions(KEYS.FUND_TRANSFERS, [transferId]);
  save(KEYS.FUND_TRANSFERS, all);

  const allTxns = load<Transaction[]>(KEYS.TRANSACTIONS, []);
  const removedTxnIds = allTxns.filter(t => t.transferRef === transferId).map(t => t.id);
  const remainingTxns = allTxns.filter(t => t.transferRef !== transferId);
  if (remainingTxns.length !== allTxns.length) {
    recordDeletions(KEYS.TRANSACTIONS, removedTxnIds);
    save(KEYS.TRANSACTIONS, remainingTxns, { deleteIds: removedTxnIds });
  }

  const ledgerEntries = load<CashLedgerEntry[]>(KEYS.CASH_LEDGER_ENTRIES, []);
  const removedLedgerIds = ledgerEntries.filter(e => e.referenceNo === transferId).map(e => e.id);
  const remainingLedgerEntries = ledgerEntries.filter(e => e.referenceNo !== transferId);
  if (remainingLedgerEntries.length !== ledgerEntries.length) {
    recordDeletions(KEYS.CASH_LEDGER_ENTRIES, removedLedgerIds);
    save(KEYS.CASH_LEDGER_ENTRIES, remainingLedgerEntries);
  }

  writeAuditLog(userId, companyId, "DELETE_FUND_TRANSFER", "fund_transfer", transferId, {
    amount: removed.amount,
    purpose: removed.purpose,
    status: removed.status,
  });
  return {};
}

export function saveFundTransfer(payload: Omit<FundTransfer, "id" | "createdAt">, id?: string) {
  initDB();
  const all = load<FundTransfer[]>(KEYS.FUND_TRANSFERS, []);
  if (id) {
    const idx = all.findIndex(a => a.id === id);
    if (idx > -1) {
      all[idx] = { ...all[idx], ...payload } as FundTransfer;
    } else {
      all.push({
        ...payload,
        id,
        createdAt: new Date().toISOString()
      } as FundTransfer);
    }
  } else {
    all.push({
      ...payload,
      id: `FT-${Date.now()}`,
      createdAt: new Date().toISOString()
    } as FundTransfer);
  }
  save(KEYS.FUND_TRANSFERS, all);
  return { success: true };
}

export function getCustomDeadlines(userId: string, companyId: string): CustomDeadline[] {
  initDB();
  const all = load<CustomDeadline[]>(KEYS.CUSTOM_DEADLINES, []);
  if (companyId === "all") {
    return all.filter((d) => canAccessCompany(userId, d.companyId));
  }
  if (!canAccessCompany(userId, companyId)) return [];
  return all.filter((d) => d.companyId === companyId);
}

export function saveCustomDeadline(payload: Omit<CustomDeadline, "id">, id?: string) {
  initDB();
  const all = load<CustomDeadline[]>(KEYS.CUSTOM_DEADLINES, []);
  if (id) {
    const idx = all.findIndex((d) => d.id === id);
    if (idx > -1) {
      all[idx] = { ...all[idx], ...payload } as CustomDeadline;
    } else {
      all.push({ ...payload, id } as CustomDeadline);
    }
  } else {
    all.push({ ...payload, id: `c-dl-${Date.now()}` } as CustomDeadline);
  }
  save(KEYS.CUSTOM_DEADLINES, all);
  return { success: true };
}

export function deleteCustomDeadline(id: string) {
  initDB();
  const all = load<CustomDeadline[]>(KEYS.CUSTOM_DEADLINES, []);
  recordDeletions(KEYS.CUSTOM_DEADLINES, [id]);
  save(KEYS.CUSTOM_DEADLINES, all.filter((d) => d.id !== id));
  return { success: true };
}
