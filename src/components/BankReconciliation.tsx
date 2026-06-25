import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Activity,
  Layers,
  ShieldCheck,
  Building2,
  BookOpen,
} from "lucide-react";
import { getTransactions, getCompanies, getCashAccounts, saveBankStatementLines, saveBankReconciliation } from "../data/mockDatabase";
import { Transaction, Company, CashAccount, BankReconciliation as ReconcileReq } from "../types";
import { toast } from "sonner";

interface BankReconciliationProps {
  userId: string;
  companyId: string;
}

interface BankRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "deposit" | "withdrawal";
  reconciledWith?: string;
  reconciledAmount?: number;
}

export default function BankReconciliation({
  userId,
  companyId,
}: BankReconciliationProps) {
  const [bankRecords, setBankRecords] = useState<BankRecord[]>([]);
  const [ledgerTxns, setLedgerTxns] = useState<(Transaction & { reconciled?: boolean })[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyId === 'all' ? "" : companyId);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  useEffect(() => {
    setCompanies(getCompanies());
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      setCashAccounts(getCashAccounts(selectedCompanyId));
    } else {
      setCashAccounts([]);
    }
    setSelectedAccountId("");
  }, [selectedCompanyId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCompanyId || !selectedAccountId || !selectedPeriod) {
      toast.error("Please select Company, Account, and Period first.");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        const records: BankRecord[] = [];
        data.slice(1).forEach((row: any, i: number) => {
          if (!row[0]) return;
          const amtStr = String(row[2] || "").replace(/,/g, '');
          const amt = parseFloat(amtStr) || 0;
          records.push({
            id: `bank-${i}`,
            date: row[0],
            description: row[1] || "Unknown",
            amount: amt,
            type: amt > 0 ? "deposit" : "withdrawal",
          });
        });

        // Get ledger transactions for comparison
        const allTxns: (Transaction & { reconciled?: boolean })[] = getTransactions(userId, selectedCompanyId)
            .filter(t => t.txnDate.startsWith(selectedPeriod) && t.status === 'approved' && !t.reversalOf);
            
        setLedgerTxns(allTxns);

        // Auto-reconcile logic
        const matchedBank = records.map((br) => {
          const match = allTxns.find(
            (lt) =>
              !lt.reconciled &&
              Math.abs(lt.amount) === Math.abs(br.amount) &&
              lt.txnDate.substring(0, 10).replace(/-/g, '') === String(br.date).replace(/[-\/]/g, '').substring(0, 8)
          ) || allTxns.find(
             (lt) => 
               !lt.reconciled && Math.abs(lt.amount) === Math.abs(br.amount)
          );

          if (match) {
            br.reconciledWith = match.id;
            br.reconciledAmount = match.amount;
            match.reconciled = true;
          }
          return br;
        });

        setBankRecords(matchedBank);
        toast.success(`Parsed ${matchedBank.length} row(s) from statement.`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse statement. Please ensure it is a valid CSV/Excel file.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleReconcile = () => {
    // Generate simple reconciliation report state and save it
    // Calculating balances
    const statementBal = bankRecords.reduce((acc, row) => acc + row.amount, 0);
    const bookBal = ledgerTxns.reduce((acc, row) => acc + (row.type === 'cash_in' ? row.amount : -row.amount), 0);
    
    saveBankReconciliation(userId, selectedCompanyId, {
      cashAccountId: selectedAccountId,
      periodMonth: selectedPeriod,
      bookBalance: bookBal,
      statementBalance: statementBal,
      difference: Math.abs(bookBal - statementBal),
      status: 'for review'
    });

    toast.success("Reconciliation saved for review.");
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-[#181A1C] border border-[#24272C] p-5 shadow-xs flex flex-col items-start gap-4 rounded-2xl">
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-white font-display text-lg tracking-tight flex items-center gap-1.5 font-bold">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Bank Reconciliation Engine</span>
            </h1>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mt-0.5">
              Automated matching of CSV statements to ledger entries.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-4 border-t border-[#24272C]">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 ml-1">Entity / Company</label>
            <select 
              value={selectedCompanyId} 
              onChange={e => setSelectedCompanyId(e.target.value)} 
              className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-white text-xs rounded-xl font-mono focus:border-emerald-500 focus:outline-none"
            >
              <option value="" disabled>Select Company</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 ml-1">Cash / Bank Account</label>
            <select 
              value={selectedAccountId} 
              onChange={e => setSelectedAccountId(e.target.value)} 
              className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-white text-xs rounded-xl font-mono focus:border-emerald-500 focus:outline-none"
              disabled={!selectedCompanyId}
            >
              <option value="" disabled>Select Account</option>
              {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.bankName} - {a.accountName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 ml-1">Period (Month)</label>
            <input 
              type="month" 
              value={selectedPeriod} 
              onChange={e => setSelectedPeriod(e.target.value)} 
              className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-white text-xs rounded-xl font-mono focus:border-emerald-500 focus:outline-none text-center" 
            />
          </div>
        </div>
      </div>

      <div className="bg-[#141618] border border-[#24272C] p-6 rounded-2xl flex flex-col items-center">
        <div className={`flex flex-col items-center justify-center border-2 border-dashed ${(!selectedCompanyId || !selectedAccountId || !selectedPeriod) ? 'border-[#24272C]/50 opacity-50' : 'border-[#24272C] hover:border-emerald-500/50 cursor-pointer'} transition-colors p-10 py-16 w-full max-w-2xl rounded-2xl bg-[#181A1C]`}>
          <Upload className={`w-10 h-10 ${(!selectedCompanyId || !selectedAccountId || !selectedPeriod) ? 'text-zinc-600' : 'text-emerald-500 mb-4 animate-bounce'}`} />
          <p className="text-white font-bold mb-2 font-display text-lg">
            Upload Bank Statement CSV
          </p>
          <label className={`px-6 py-2.5 rounded-full font-bold transition shadow-lg mt-2 ${(!selectedCompanyId || !selectedAccountId || !selectedPeriod) ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'}`}>
            Select Statement File
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              className="hidden"
              onChange={handleFileUpload}
              disabled={!selectedCompanyId || !selectedAccountId || !selectedPeriod}
            />
          </label>
          <p className="text-[10px] text-zinc-500 mt-4 uppercase font-mono tracking-widest text-center">
            Supported Columns: <br /> [1] Date (YYYY-MM-DD) | [2] Description |
            [3] Amount
          </p>
        </div>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center py-10">
          <Activity className="w-8 h-8 text-emerald-500 animate-pulse" />
          <span className="ml-3 text-zinc-400 font-mono uppercase text-xs">
            Analyzing statement...
          </span>
        </div>
      )}

      {bankRecords.length > 0 && !isProcessing && (
        <div className="space-y-6">
          <div className="flex justify-end">
             <button onClick={handleReconcile} className="bg-emerald-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg hover:bg-emerald-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Save Reconciliation
             </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#141618] border border-[#24272C] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 border-b border-[#24272C] pb-3">
                <h3 className="text-zinc-300 font-bold font-mono tracking-wider text-xs uppercase">
                  Bank Statement Lines
                </h3>
                <span className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-400 rounded-lg">
                  {bankRecords.length} Rows parsed
                </span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {bankRecords.map((br) => (
                  <div
                    key={br.id}
                    className="p-3 bg-[#181A1C] border border-[#24272C] rounded-xl flex justify-between items-center text-sm font-mono text-zinc-300 shadow-sm"
                  >
                    <div className="truncate pr-4">
                      <div className="text-[10px] text-zinc-500 font-bold bg-[#141618] px-1.5 py-0.5 rounded inline-block mb-1">
                        {br.date}
                      </div>
                      <div
                        className="truncate text-xs text-white max-w-[200px] leading-tight"
                        title={br.description}
                      >
                        {br.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`font-bold ${br.amount > 0 ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {new Intl.NumberFormat("en-PH", {
                          style: "currency",
                          currency: "PHP",
                        }).format(br.amount)}
                      </span>
                      {br.reconciledWith ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#141618] border border-[#24272C] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 border-b border-[#24272C] pb-3">
                <h3 className="text-zinc-300 font-bold font-mono tracking-wider text-xs uppercase">
                  Reconciled Ledger Matches
                </h3>
                <span className="text-[10px] px-2 py-1 bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 rounded-lg">
                  {bankRecords.filter((b) => b.reconciledWith).length} Matched
                </span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {bankRecords.map((br) => {
                  const match = ledgerTxns.find(
                    (t) => t.id === br.reconciledWith,
                  );
                  if (!match) return null;
                  return (
                    <div
                      key={`match-${br.id}`}
                      className="p-3 bg-emerald-900/10 border border-emerald-900/30 rounded-xl flex justify-between items-center text-sm font-mono text-zinc-300 shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                      <div className="pl-2">
                        <div className="text-[10px] text-emerald-500 font-bold">
                          {match.txnDate}
                        </div>
                        <div
                          className="text-xs text-white truncate max-w-[200px]"
                          title={match.purpose}
                        >
                          {match.purpose}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 bg-[#181A1C] px-2 py-1 rounded-lg border border-[#24272C]">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                          Matched
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
