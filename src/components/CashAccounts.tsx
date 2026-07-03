import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, ShieldCheck, UploadCloud, Download, Loader2 } from "lucide-react";
import { CashAccount, Company } from "../types";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from 'xlsx';
import {
  getCompanies,
  saveCashAccount,
  deleteCashAccount,
  useDBUpdate,
  writeAuditLog,
} from "../data/mockDatabase";
import { toast } from "sonner";
import { exportCashAccountsToExcel } from "../lib/cashAccountsExport";

const DB_PREFIX = "finance_db_v3_";
const CASH_ACCOUNTS_KEY = DB_PREFIX + "cash_accounts";


// ─── Default seed accounts (used when SQL + localStorage are both empty) ─────
/* Default account seeding removed. Accounts must be created explicitly by users.
const DEFAULT_SEED_ACCOUNTS: Partial<CashAccount>[] = [
  // Bigstop
  { companyId: "c-bgs", accountType: "Bank",         bankName: "Security Bank", accountName: "Security Bank - Bigstop",        accountNumber: "0000054663022",    accountHolder: "HHC Franchise Hub",           openingBalance: 0, isActive: true },
  { companyId: "c-bgs", accountType: "E-Wallet",     bankName: "GCash",         accountName: "Bigstop GCash",                  accountNumber: "09687912017",       accountHolder: "Anna Jane Herrera",           openingBalance: 0, isActive: true },
  { companyId: "c-bgs", accountType: "Cash on Hand", bankName: "",              accountName: "Cash On Hand - Bigstop",         accountNumber: "",                  accountHolder: "Bigstop",                     openingBalance: 0, isActive: true },
  // Herrera Property
  { companyId: "c-hbp", accountType: "Cash on Hand", bankName: "",              accountName: "Cash On Hand - Herrera Property",accountNumber: "",                  accountHolder: "Herrera Property",            openingBalance: 0, isActive: true },
  { companyId: "c-hbp", accountType: "E-Wallet",     bankName: "GCash",         accountName: "Herrera Property GCash",         accountNumber: "09565937890",       accountHolder: "Mark Herrera",                openingBalance: 0, isActive: true },
  // HHC Franchise Hub
  { companyId: "c-frn", accountType: "Bank",         bankName: "RCBC",          accountName: "RCBC - HHC Franchise Hub",       accountNumber: "0000007591347012",  accountHolder: "HHC Franchise Hub",           openingBalance: 0, isActive: true },
  { companyId: "c-frn", accountType: "Cash on Hand", bankName: "",              accountName: "Cash On Hand - HHC Franchise Hub",accountNumber: "",                 accountHolder: "HHC Franchise Hub",           openingBalance: 0, isActive: true },
  // Blesscent
  { companyId: "c-bls", accountType: "Bank",         bankName: "Security Bank", accountName: "Security Bank - Blesscent",      accountNumber: "0000075257037",     accountHolder: "Blesscent Marketing Corp",    openingBalance: 0, isActive: true },
  { companyId: "c-bls", accountType: "E-Wallet",     bankName: "GCash",         accountName: "Blesscent GCash",                accountNumber: "09193305412",       accountHolder: "Mark Herrera",                openingBalance: 0, isActive: true },
  { companyId: "c-bls", accountType: "Cash on Hand", bankName: "",              accountName: "Cash On Hand - Blesscent",       accountNumber: "",                  accountHolder: "Blesscent",                   openingBalance: 0, isActive: true },
  // Scentimo
  { companyId: "c-sct", accountType: "Bank",         bankName: "Security Bank", accountName: "Security Bank - Scentimo",       accountNumber: "0000041508572",     accountHolder: "Scentimo Manufacturing Corp", openingBalance: 0, isActive: true },
  { companyId: "c-sct", accountType: "Cash on Hand", bankName: "",              accountName: "Cash On Hand - Scentimo",        accountNumber: "",                  accountHolder: "Scentimo",                    openingBalance: 0, isActive: true },
];
*/

// ─── helpers to keep localStorage in sync with SQL ──────────────────────────
function syncToLocalStorage(accounts: CashAccount[]) {
  try {
    localStorage.setItem(CASH_ACCOUNTS_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new Event("db-update"));
  } catch (_) {}
}

// ─── API layer ───────────────────────────────────────────────────────────────
async function apiGetAccounts(companyId: string): Promise<CashAccount[]> {
  const res = await fetch(`/api/cash-accounts/${companyId}`);
  if (!res.ok) throw new Error("Failed to load accounts from SQL");
  return res.json();
}

async function apiCreateAccount(payload: Partial<CashAccount>): Promise<CashAccount> {
  const res = await fetch("/api/cash-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create account");
  return data.account;
}

async function apiUpdateAccount(id: string, payload: Partial<CashAccount>): Promise<CashAccount> {
  const res = await fetch(`/api/cash-accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update account");
  return data.account;
}

async function apiDeleteAccount(id: string): Promise<void> {
  const res = await fetch(`/api/cash-accounts/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to delete account");
  }
}

interface CashAccountsProps {
  userId: string;
  companyId: string;
}

export default function CashAccounts({ userId, companyId }: CashAccountsProps) {
  const dbTick = useDBUpdate();
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected Company Filter
  const [filterCompany, setFilterCompany] = useState<string>(companyId === "all" ? "" : companyId);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyId: filterCompany || "",
    accountType: "Bank" as 'Bank' | 'E-Wallet' | 'Cash on Hand' | 'Main Vault',
    bankName: "",
    accountName: "",
    accountNumber: "",
    accountHolder: "",
    openingBalance: 0,
    currentBalance: 0,
    isActive: true,
  });

  useEffect(() => {
    setCompanies(getCompanies());
    loadAccounts();
  }, [filterCompany, companyId, dbTick]);

  // ── Load from SQL, fallback to localStorage if server unreachable ──────────
  const loadAccounts = async () => {
    const target = filterCompany || companyId;
    try {
      const sqlAccounts = await apiGetAccounts(target);

      /* Legacy local/browser-to-SQL seeding removed.
      if (sqlAccounts.length === 0) {
        const cached: CashAccount[] = JSON.parse(localStorage.getItem(CASH_ACCOUNTS_KEY) || "[]");
        const cachedForTarget = target === "all" ? cached : cached.filter(a => a.companyId === target);

        // If localStorage also empty, use DEFAULT_SEED_ACCOUNTS as fallback seed source
        const sourceForSeed: Partial<CashAccount>[] = cachedForTarget.length > 0
          ? cachedForTarget
          : (target === "all"
              ? DEFAULT_SEED_ACCOUNTS
              : DEFAULT_SEED_ACCOUNTS.filter(a => a.companyId === target));

        if (sourceForSeed.length > 0) {
          // Seed SQL from source (non-blocking, best-effort)
          const seedPromises = sourceForSeed.map(acc =>
            apiCreateAccount(acc).catch(() => null)
          );
          await Promise.all(seedPromises);
          // Re-fetch after seeding
          sqlAccounts = await apiGetAccounts(target);
        }
      }
      */

      // Keep localStorage in sync so the rest of the app (mockDatabase callers) see the same data
      if (target === "all") {
        syncToLocalStorage(sqlAccounts);
      } else {
        // Merge: keep accounts for other companies untouched in localStorage
        const existing: CashAccount[] = JSON.parse(localStorage.getItem(CASH_ACCOUNTS_KEY) || "[]");
        const others = existing.filter(a => a.companyId !== target);
        syncToLocalStorage([...others, ...sqlAccounts]);
      }
      setAccounts(sqlAccounts);
    } catch (err) {
      // SQL unreachable – fall back to localStorage cache so UI doesn't break
      console.warn("SQL unreachable, using localStorage cache:", err);
      const cached: CashAccount[] = JSON.parse(localStorage.getItem(CASH_ACCOUNTS_KEY) || "[]");
      const filtered = (target === "all") ? cached : cached.filter(a => a.companyId === target);
      setAccounts(filtered);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId) { toast.error("Please select a company."); return; }
    setIsSaving(true);
    try {
      if (editingId) {
        try {
          await apiUpdateAccount(editingId, formData);
          writeAuditLog(userId, formData.companyId, "UPDATE_CASH_ACCOUNT", "cash_account", editingId, { name: formData.accountName });
        } catch {
          const result = saveCashAccount(userId, formData.companyId, formData, editingId);
          if (result.error) throw new Error(result.error);
        }
        toast.success("Account updated!");
      } else {
        try {
          const created = await apiCreateAccount({ ...formData, currentBalance: formData.openingBalance });
          writeAuditLog(userId, formData.companyId, "CREATE_CASH_ACCOUNT", "cash_account", created.id, { name: formData.accountName });
        } catch {
          const result = saveCashAccount(userId, formData.companyId, { ...formData, currentBalance: formData.openingBalance });
          if (result.error) throw new Error(result.error);
        }
        toast.success("Account created!");
      }
      setIsModalOpen(false);
      setEditingId(null);
      await loadAccounts();
      setFormData({ companyId: filterCompany || "", accountType: "Bank", bankName: "", accountName: "", accountNumber: "", accountHolder: "", openingBalance: 0, currentBalance: 0, isActive: true });
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (acc: CashAccount) => {
    setEditingId(acc.id);
    setFormData({ companyId: acc.companyId, accountType: acc.accountType, bankName: acc.bankName, accountName: acc.accountName, accountNumber: acc.accountNumber, accountHolder: acc.accountHolder, openingBalance: acc.openingBalance, currentBalance: acc.currentBalance, isActive: acc.isActive });
    setIsModalOpen(true);
  };

  const handleDelete = async (acc: CashAccount) => {
    if (!confirm(`Delete ${acc.accountName}? This cannot be undone.`)) return;
    try {
      try {
        await apiDeleteAccount(acc.id);
        writeAuditLog(userId, acc.companyId, "DELETE_CASH_ACCOUNT", "cash_account", acc.id, { name: acc.accountName });
      } catch {
        const result = deleteCashAccount(userId, acc.companyId, acc.id);
        if (result.error) throw new Error(result.error);
      }
      toast.success("Account deleted!");
      await loadAccounts();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    const targetCompanyId = filterCompany || (companyId !== "all" ? companyId : "");
    if (!targetCompanyId) { toast.error("Please select a company first to import accounts."); return; }
    setIsImporting(true);
    const toastId = toast.loading("Reading file...");
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          if (!data) throw new Error("No data in file");
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const csvText = XLSX.utils.sheet_to_csv(ws);
          const response = await fetch("/api/parse-accounts-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: csvText }) });
          if (!response.ok) { const e = await response.json(); throw new Error(e.error || "Failed to scan"); }
          const parsedAccounts = await response.json();
          if (!Array.isArray(parsedAccounts) || parsedAccounts.length === 0) throw new Error("No accounts found in document.");
          let addedCount = 0;
          for (const acc of parsedAccounts) {
            try {
              await apiCreateAccount({ companyId: targetCompanyId, accountType: acc.accountType === "Bank" || acc.accountType === "E-Wallet" || acc.accountType === "Cash on Hand" ? acc.accountType : "Bank", bankName: acc.bankName || "Unknown Bank", accountName: acc.accountName || "Imported Account", accountNumber: acc.accountNumber || "", accountHolder: acc.accountHolder || "", openingBalance: 0, currentBalance: 0, isActive: true });
              addedCount++;
            } catch {
              const result = saveCashAccount(userId, targetCompanyId, { companyId: targetCompanyId, accountType: acc.accountType === "Bank" || acc.accountType === "E-Wallet" || acc.accountType === "Cash on Hand" ? acc.accountType : "Bank", bankName: acc.bankName || "Unknown Bank", accountName: acc.accountName || "Imported Account", accountNumber: acc.accountNumber || "", accountHolder: acc.accountHolder || "", openingBalance: 0, currentBalance: 0, isActive: true });
              if (!result.error) addedCount++;
            }
          }
          toast.success(`Imported ${addedCount} account(s)!`, { id: toastId });
          await loadAccounts();
        } catch (error: any) { toast.error(error.message, { id: toastId }); }
        finally { setIsImporting(false); }
      };
      reader.onerror = () => { toast.error("Failed to read file.", { id: toastId }); setIsImporting(false); };
      reader.readAsArrayBuffer(file);
    } catch (error: any) { toast.error(error.message, { id: toastId }); setIsImporting(false); }
  };

  const handleExportExcel = () => {
    if (accounts.length === 0) {
      toast.error("There are no cash or bank accounts to export.");
      return;
    }

    const selectedCompany = companies.find(company => company.id === (filterCompany || companyId));
    const scopeLabel = selectedCompany?.name || "All Companies";
    exportCashAccountsToExcel(accounts, companies, scopeLabel);
    toast.success(`Exported ${accounts.length} account(s) to Excel.`);
  };

  const formatPeso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-slate-900 font-display text-2xl tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            Cash & Bank Accounts
          </h1>
          <p className="text-sm text-slate-600 font-mono mt-1">Manage corporate bank accounts, e-wallets, and vaults.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {companyId === "all" && (
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="bg-white text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm border border-slate-200 shrink-0">
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            Auto Import via Excel
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls,.csv" className="hidden" />

          <button onClick={handleExportExcel} disabled={accounts.length === 0} className="flex items-center gap-2 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm border border-slate-200 shrink-0">
            <Download className="w-4 h-4" />
            Auto Export via Excel
          </button>

          <button
            onClick={() => { setEditingId(null); setIsModalOpen(true); setFormData({...formData, companyId: filterCompany || (companyId !== "all" ? companyId : "")}); }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-lg shrink-0"
          >
            <Plus className="w-4 h-4" /> New Account
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 font-mono">
            <thead className="bg-white border-b border-slate-200 text-xs uppercase tracking-widest text-slate-500">
              <tr>
                <th className="p-4">Account Details</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-right">Balance</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic text-xs">
                    No cash or bank accounts configured.
                  </td>
                </tr>
              ) : accounts.map((acc) => {
                const comp = companies.find(c => c.id === acc.companyId);
                return (
                  <tr key={acc.id} className="border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-bold text-sm truncate max-w-[250px]">{acc.accountName}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-emerald-950/40 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded border border-emerald-900/50">{acc.bankName}</span>
                          <span className="text-xs text-slate-500">{acc.accountNumber || "N/A"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-700 font-bold bg-slate-50 px-2 py-1 rounded text-xs">{comp?.name || "Unknown"}</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider ${
                        acc.accountType === "Bank" ? "bg-blue-100 text-blue-700" :
                        acc.accountType === "E-Wallet" ? "bg-purple-100 text-purple-700" :
                        acc.accountType === "Cash on Hand" ? "bg-emerald-100 text-emerald-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>{acc.accountType}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-bold font-mono text-sm ${(acc.currentBalance ?? acc.openingBalance) < 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {formatPeso(acc.currentBalance ?? acc.openingBalance ?? 0)}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono">Opening: {formatPeso(acc.openingBalance ?? 0)}</div>
                    </td>
                    <td className="p-4">
                      <AnimatePresence mode="wait">
                        {acc.isActive ? (
                          <motion.span key="active" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider inline-block">Active</motion.span>
                        ) : (
                          <motion.span key="inactive" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className="bg-slate-500/10 text-slate-600 border border-slate-300/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider inline-block">Inactive</motion.span>
                        )}
                      </AnimatePresence>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(acc)} className="p-1.5 text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition" title="Edit Account">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(acc)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition" title="Delete Account">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="text-slate-900 font-bold font-display tracking-tight text-lg">{editingId ? "Edit Account" : "Add Account"}</h3>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {companyId === "all" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 ml-1">Entity</label>
                  <select required value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl font-mono focus:border-emerald-500 focus:outline-none">
                    <option value="" disabled>Select Company</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 ml-1">Account Type</label>
                  <select required value={formData.accountType} onChange={e => setFormData({...formData, accountType: e.target.value as any})} className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl font-mono focus:border-emerald-500 focus:outline-none">
                    <option value="Bank">Bank</option>
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Cash on Hand">Cash on Hand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 ml-1">Bank / Wallet</label>
                  <input required type="text" placeholder="Security Bank" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl font-mono focus:border-emerald-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 ml-1">Account Name</label>
                <input required type="text" placeholder="e.g. Bigstop GCash 1" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl font-mono focus:border-emerald-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 ml-1">Account Number</label>
                  <input type="text" placeholder="N/A" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl font-mono focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 ml-1">Holder Name</label>
                  <input required type="text" placeholder="Anna Jane Herrera" value={formData.accountHolder} onChange={e => setFormData({...formData, accountHolder: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl font-mono focus:border-emerald-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 ml-1">Opening Balance (₱)</label>
                <input required type="number" step="0.01" min="0" placeholder="0.00" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl font-mono focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 rounded border-slate-200 bg-white text-emerald-500 focus:ring-emerald-500" />
                  <span className="text-xs text-slate-900 font-mono">Account is Active</span>
                </label>
              </div>
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-60">
                  {isSaving ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
