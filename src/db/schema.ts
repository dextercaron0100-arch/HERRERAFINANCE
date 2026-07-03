import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, doublePrecision, uuid, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  isGroupAdmin: boolean('is_group_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userCompanyRoles = pgTable('user_company_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cashAccounts = pgTable('cash_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  accountType: text('account_type').notNull(),
  bankName: text('bank_name').notNull(),
  accountName: text('account_name').notNull(),
  accountNumber: text('account_number').notNull(),
  accountHolder: text('account_holder').notNull(),
  openingBalance: doublePrecision('opening_balance').notNull().default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(), // Assuming it just needs a UUID reference
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileUrl: text('file_url').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  txnDate: text('txn_date').notNull(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  cashAccountId: uuid('cash_account_id').references(() => cashAccounts.id),
  categoryId: uuid('category_id').references(() => categories.id).notNull(),
  type: text('type').notNull(),
  amount: doublePrecision('amount').notNull(),
  purpose: text('purpose').notNull(),
  encodedBy: uuid('encoded_by').references(() => users.id).notNull(),
  status: text('status').notNull(),
  transferRef: text('transfer_ref'),
  tags: jsonb('tags').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
