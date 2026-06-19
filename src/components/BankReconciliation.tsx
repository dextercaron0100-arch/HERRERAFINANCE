import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Activity,
  Layers,
} from "lucide-react";
import { getTransactions } from "../data/mockDatabase";
import { Transaction } from "../types";

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
}

export default function BankReconciliation({
  userId,
  companyId,
}: BankReconciliationProps) {
  const [bankRecords, setBankRecords] = useState<BankRecord[]>([]);
  const [ledgerTxns, setLedgerTxns] = useState<
    (Transaction & { reconciled?: boolean })[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const amt = parseFloat(row[2]) || 0;
          records.push({
            id: `bank-${i}`,
            date: row[0],
            description: row[1] || "Unknown",
            amount: amt,
            type: amt > 0 ? "deposit" : "withdrawal",
          });
        });

        // Mock getting ledger transactions for comparison
        const allTxns: (Transaction & { reconciled?: boolean })[] =
          getTransactions(userId, companyId);
        setLedgerTxns(allTxns);

        // Auto-reconcile logic (simple exact match)
        const matchedBank = records.map((br) => {
          const match = allTxns.find(
            (lt) =>
              !lt.reconciled &&
              Math.abs(lt.amount) === Math.abs(br.amount) &&
              lt.txnDate.substring(0, 10) === br.date.substring(0, 10),
          );
          if (match) {
            br.reconciledWith = match.id;
            match.reconciled = true; // In UI state only
          }
          return br;
        });

        setBankRecords(matchedBank);
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-[#181A1C] border border-[#24272C] p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl">
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

      <div className="bg-[#141618] border border-[#24272C] p-6 rounded-2xl flex flex-col items-center">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#24272C] hover:border-emerald-500/50 transition-colors p-10 py-16 w-full max-w-2xl rounded-2xl bg-[#181A1C]">
          <Upload className="w-10 h-10 text-emerald-500 mb-4 animate-bounce" />
          <p className="text-white font-bold mb-2 font-display text-lg">
            Upload Bank Statement CSV
          </p>
          <label className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-full font-bold cursor-pointer transition shadow-lg mt-2">
            Select Statement File
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              className="hidden"
              onChange={handleFileUpload}
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
      )}
    </div>
  );
}
