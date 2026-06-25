import React, { useState, useEffect } from "react";
import { getCashLedgerEntries, getCashAccounts, getCompanies, getCashCustodians, saveCashLedgerEntry } from "../data/mockDatabase";
import { CashLedgerEntry } from "../types";
import { Plus, Filter, Download } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userId: string;
  companyId: string;
}

export default function CashLedger({ userId, companyId }: Props) {
  const [entries, setEntries] = useState<CashLedgerEntry[]>([]);
  const [forceRender, setForceRender] = useState(0);

  useEffect(() => {
    setEntries(getCashLedgerEntries(companyId === "all" ? "" : companyId));
  }, [companyId, forceRender]);

  const allAccounts = getCashAccounts(companyId === "all" ? "" : companyId);
  const allCustodians = getCashCustodians(companyId === "all" ? "" : companyId);
  const companies = getCompanies();

  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
  };

  const handleNewEntry = () => {
    if (allAccounts.length === 0) {
      toast.error("Please create a cash account first.");
      return;
    }
    
    // Default to the first account for demo
    const acc = allAccounts[0];
    saveCashLedgerEntry({
      date: new Date().toISOString().split("T")[0],
      companyId: acc.companyId,
      cashAccountId: acc.id,
      custodianId: acc.assignedCustodian || null,
      transactionType: "Cash Sale",
      referenceNo: `REF-${Date.now().toString().slice(-6)}`,
      description: "Manual entry for testing",
      cashIn: 1000,
      cashOut: 0,
      createdBy: userId,
      approvedBy: null,
    });
    setForceRender(prev => prev + 1);
    toast.success("Test ledger entry added.");
  };

  return (
    <div className="bg-[#141618] border border-[#24272C] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[#24272C] bg-[#181A1C] flex justify-between items-center">
        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-widest">Cash Ledger</h3>
        <div className="flex gap-2">
          <button 
            onClick={handleNewEntry}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            <Plus className="w-3 h-3" /> New Entry
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-400 font-mono">
          <thead className="bg-[#181A1C] border-b border-[#24272C] text-[10px] uppercase tracking-widest">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Account / Custodian</th>
              <th className="p-3">Transaction details</th>
              <th className="p-3 text-right text-emerald-400">Cash In</th>
              <th className="p-3 text-right text-rose-400">Cash Out</th>
              <th className="p-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500 italic">No ledger entries found.</td>
              </tr>
            ) : (
              entries.map(e => {
                const acc = allAccounts.find(a => a.id === e.cashAccountId);
                const cust = allCustodians.find(c => c.id === e.custodianId);
                return (
                  <tr key={e.id} className="border-b border-[#24272C] hover:bg-[#1D2024]">
                    <td className="p-3">{e.date}</td>
                    <td className="p-3">
                      <div className="font-bold text-white">{acc ? acc.accountName : "Unknown"}</div>
                      <div className="text-[10px]">{cust ? cust.name : "Unassigned"}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-white">{e.transactionType}</div>
                      <div className="text-[10px]">{e.description} • {e.referenceNo}</div>
                    </td>
                    <td className="p-3 text-right text-emerald-400 font-bold">{e.cashIn > 0 ? formatPeso(e.cashIn) : "-"}</td>
                    <td className="p-3 text-right text-rose-400 font-bold">{e.cashOut > 0 ? formatPeso(e.cashOut) : "-"}</td>
                    <td className="p-3 text-right font-bold text-white">{formatPeso(e.runningBalance)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
