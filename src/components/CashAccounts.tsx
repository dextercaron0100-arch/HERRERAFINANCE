import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, CheckCircle2, ShieldCheck, BookOpen, Search, ArrowRight, UploadCloud, Loader2 } from "lucide-react";
import { CashAccount, Company } from "../types";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from 'xlsx';
import {
  getCashAccounts,
  saveCashAccount,
  deleteCashAccount,
  getCompanies,
  useDBUpdate,
} from "../data/mockDatabase";
import { toast } from "sonner";

interface CashAccountsProps {
  userId: string;
  companyId: string;
}

export default function CashAccounts({ userId, companyId }: CashAccountsProps) {
  const dbTick = useDBUpdate();
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Selected Company Filter (defaults to ALL if companyId is 'all')
  const [filterCompany, setFilterCompany] = useState<string>(companyId === 'all' ? "" : companyId);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
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

  const loadAccounts = () => {
    let allAccounts: CashAccount[] = [];
    const comps = getCompanies();
    if (filterCompany) {
      allAccounts = getCashAccounts(filterCompany);
    } else if (companyId === 'all') {
      comps.forEach(c => {
        allAccounts = allAccounts.concat(getCashAccounts(c.id));
      });
    } else {
      allAccounts = getCashAccounts(companyId);
    }
    setAccounts(allAccounts);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId) {
      toast.error("Please select a company.");
      return;
    }
    
    // For new accounts, default currentBalance to openingBalance
    const payloadToSave = {
      ...formData,
      currentBalance: editingId ? formData.currentBalance : formData.openingBalance
    };

    const res = saveCashAccount(userId, formData.companyId, payloadToSave, editingId || undefined);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(editingId ? "Account updated!" : "Account created!");
      setIsModalOpen(false);
      setEditingId(null);
      loadAccounts();
      setFormData({
        companyId: filterCompany || "",
        accountType: "Bank",
        bankName: "",
        accountName: "",
        accountNumber: "",
        accountHolder: "",
        openingBalance: 0,
        currentBalance: 0,
        isActive: true,
      });
    }
  };

  const handleEdit = (acc: CashAccount) => {
    setEditingId(acc.id);
    setFormData({
      companyId: acc.companyId,
      accountType: acc.accountType,
      bankName: acc.bankName,
      accountName: acc.accountName,
      accountNumber: acc.accountNumber,
      accountHolder: acc.accountHolder,
      openingBalance: acc.openingBalance,
      currentBalance: acc.currentBalance,
      isActive: acc.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (acc: CashAccount) => {
    if (confirm(`Are you sure you want to delete ${acc.accountName}? This action cannot be undone.`)) {
      const res = deleteCashAccount(userId, acc.companyId, acc.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Account deleted!");
        loadAccounts();
      }
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    const targetCompanyId = filterCompany || (companyId !== 'all' ? companyId : null);
    if (!targetCompanyId) {
      toast.error("Please select a company first to import accounts.");
      return;
    }

    setIsImporting(true);
    const toastId = toast.loading("Extracting accounts from document...");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          if (!data) throw new Error("No data in file");
          
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet);

          const response = await fetch('/api/parse-accounts-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: csvText }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to scan document');
          }

          const parsedAccounts = await response.json();

          if (!Array.isArray(parsedAccounts) || parsedAccounts.length === 0) {
            throw new Error("No accounts could be found in this document.");
          }

          let addedCount = 0;
          for (const acc of parsedAccounts) {
            // basic defaults
            const newAcc = {
              companyId: targetCompanyId,
              accountType: acc.accountType === "Bank" || acc.accountType === "E-Wallet" || acc.accountType === "Cash on Hand" ? acc.accountType : "Bank",
              bankName: acc.bankName || "Unknown Bank",
              accountName: acc.accountName || "Imported Account",
              accountNumber: acc.accountNumber || "",
              accountHolder: acc.accountHolder || "",
              openingBalance: 0,
              currentBalance: 0,
              isActive: true,
            };
            
            const res = saveCashAccount(userId, targetCompanyId, newAcc);
            if (!res.error) {
              addedCount++;
            }
          }

          toast.success(`Successfully imported ${addedCount} account(s)!`, { id: toastId });
          loadAccounts();
        } catch (error: any) {
          toast.error(error.message, { id: toastId });
        } finally {
          setIsImporting(false);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read file.", { id: toastId });
        setIsImporting(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
      setIsImporting(false);
    }
  };

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
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {companyId === 'all' && (
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="bg-white text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm border border-slate-200 shrink-0"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            Auto Import via Excel
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />

          <button
            onClick={() => {
              setEditingId(null);
              setIsModalOpen(true);
              setFormData({...formData, companyId: filterCompany || (companyId !== 'all' ? companyId : '')})
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-lg shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Account
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
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 italic text-xs">
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
                          <span className="bg-emerald-950/40 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded border border-emerald-900/50">
                            {acc.bankName}
                          </span>
                          <span className="text-xs text-slate-500">{acc.accountNumber || "N/A"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-700 font-bold bg-slate-50 px-2 py-1 rounded text-xs">
                        {comp?.name || "Unknown"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider ${
                        acc.accountType === 'Bank' ? 'bg-blue-100 text-blue-700' :
                        acc.accountType === 'E-Wallet' ? 'bg-purple-100 text-purple-700' :
                        acc.accountType === 'Cash on Hand' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {acc.accountType}
                      </span>
                    </td>
                    <td className="p-4 relative">
                      <div className="relative group inline-block">
                        <AnimatePresence mode="wait">
                          {acc.isActive ? (
                            <motion.span 
                              key="active"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider inline-block cursor-help"
                            >
                              Active
                            </motion.span>
                          ) : (
                            <motion.span 
                              key="inactive"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="bg-slate-500/10 text-slate-600 border border-slate-300/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider inline-block cursor-help"
                            >
                              Inactive
                            </motion.span>
                          )}
                        </AnimatePresence>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 z-10 pointer-events-none">
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-slate-200 text-slate-700 text-[10px] p-2 rounded-lg shadow-xl text-center leading-relaxed"
                          >
                            {acc.isActive 
                              ? "Account is currently monitored in the reconciliation process." 
                              : "Account is inactive and excluded from active reconciliation."}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#24272C]" />
                          </motion.div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(acc)}
                          className="p-1.5 text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition"
                          title="Edit Account"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc)}
                          className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                          title="Delete Account"
                        >
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
              <h3 className="text-slate-900 font-bold font-display tracking-tight text-lg">
                {editingId ? "Edit Account" : "Add Account"}
              </h3>
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {companyId === 'all' && (
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
                  <input 
                    type="checkbox" 
                    checked={formData.isActive} 
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-200 bg-white text-emerald-500 focus:ring-emerald-500 focus:ring-offset-[#181A1C]"
                  />
                  <span className="text-xs text-slate-900 font-mono">Account is Active</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
