import React, { useState, useEffect } from "react";
import { getCashCounts, getCashAccounts, getCashCustodians, saveCashCount } from "../data/mockDatabase";
import { CashCount } from "../types";
import { Plus, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userId: string;
  companyId: string;
}

export default function CashCounts({ userId, companyId }: Props) {
  const [counts, setCounts] = useState<CashCount[]>([]);
  const [forceRender, setForceRender] = useState(0);

  useEffect(() => {
    setCounts(getCashCounts(companyId === "all" ? "" : companyId));
  }, [companyId, forceRender]);

  const allAccounts = getCashAccounts(companyId === "all" ? "" : companyId);
  const allCustodians = getCashCustodians(companyId === "all" ? "" : companyId);

  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
  };

  const handleNewCount = () => {
    if (allAccounts.length === 0 || allCustodians.length === 0) {
      toast.error("Please create a cash account and custodian first.");
      return;
    }
    
    // Default to the first account and custodian for demo
    const acc = allAccounts[0];
    const cust = allCustodians[0];
    saveCashCount({
      companyId: acc.companyId,
      cashAccountId: acc.id,
      custodianId: cust.id,
      countDate: new Date().toISOString().split("T")[0],
      openingCash: 10000,
      totalCashIn: 5000,
      totalCashOut: 2000,
      expectedCash: 13000,
      actualCountedCash: 12500, // Simulate short
      difference: -500,
      status: "Submitted",
      remarks: "Test submission",
      preparedBy: userId,
      reviewedBy: null,
      approvedBy: null,
      denominations: {
        qty1000: 10,
        qty500: 4,
        qty200: 2,
        qty100: 1,
        qty50: 0,
        qty20: 0,
        coinsTotal: 0
      }
    });
    setForceRender(prev => prev + 1);
    toast.success("Test cash count submitted.");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-widest">Daily Cash Counts</h3>
        <div className="flex gap-2">
          <button 
            onClick={handleNewCount}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            <Plus className="w-3 h-3" /> Perform Cash Count
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 font-mono">
          <thead className="bg-white border-b border-slate-200 text-[10px] uppercase tracking-widest">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Custodian / Account</th>
              <th className="p-3 text-right">Expected</th>
              <th className="p-3 text-right">Actual</th>
              <th className="p-3 text-right">Difference</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {counts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 italic">No cash counts found.</td>
              </tr>
            ) : (
              counts.map(c => {
                const acc = allAccounts.find(a => a.id === c.cashAccountId);
                const cust = allCustodians.find(u => u.id === c.custodianId);
                return (
                  <tr key={c.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{c.countDate}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{cust ? cust.name : "Unknown"}</div>
                      <div className="text-[10px]">{acc ? acc.accountName : "Unknown Account"}</div>
                    </td>
                    <td className="p-3 text-right">{formatPeso(c.expectedCash)}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatPeso(c.actualCountedCash)}</td>
                    <td className="p-3 text-right">
                      <span className={`font-bold ${c.difference === 0 ? "text-emerald-400" : c.difference < 0 ? "text-rose-400" : "text-amber-400"}`}>
                        {c.difference > 0 ? "+" : ""}{formatPeso(c.difference)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest font-bold ${
                        c.status === "Reconciled" ? "bg-emerald-900/50 text-emerald-400" : 
                        c.status === "Submitted" ? "bg-amber-900/50 text-amber-400" : "bg-blue-900/50 text-blue-400"
                      }`}>
                        {c.status}
                      </span>
                    </td>
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
