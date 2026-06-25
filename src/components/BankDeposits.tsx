import React, { useState, useEffect } from "react";
import { getBankDeposits, getCashAccounts, getCashCustodians, saveBankDeposit } from "../data/mockDatabase";
import { BankDeposit } from "../types";
import { Plus, Upload, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userId: string;
  companyId: string;
}

export default function BankDeposits({ userId, companyId }: Props) {
  const [deposits, setDeposits] = useState<BankDeposit[]>([]);
  const [forceRender, setForceRender] = useState(0);

  useEffect(() => {
    setDeposits(getBankDeposits(companyId === "all" ? "" : companyId));
  }, [companyId, forceRender]);

  const allAccounts = getCashAccounts(companyId === "all" ? "" : companyId);
  const allCustodians = getCashCustodians(companyId === "all" ? "" : companyId);

  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
  };

  const handleNewDeposit = () => {
    if (allAccounts.length === 0 || allCustodians.length === 0) {
      toast.error("Please create cash accounts and custodians first.");
      return;
    }
    
    // Default to the first account and custodian for demo
    const cashAcc = allAccounts.find(a => a.accountType === "Cash on Hand") || allAccounts[0];
    const bankAcc = allAccounts.find(a => a.accountType === "Bank") || allAccounts[1] || allAccounts[0];
    const cust = allCustodians[0];
    
    saveBankDeposit({
      companyId: cashAcc.companyId,
      fromCashAccountId: cashAcc.id,
      fromCustodianId: cust.id,
      toBankAccountId: bankAcc.id,
      depositDate: new Date().toISOString().split("T")[0],
      depositAmount: 5000,
      depositSlipNumber: `DS-${Date.now().toString().slice(-6)}`,
      proofOfDepositAttachment: null,
      depositedBy: userId,
      status: "Submitted",
      remarks: "Test bank deposit",
    });
    setForceRender(prev => prev + 1);
    toast.success("Test bank deposit recorded.");
  };

  return (
    <div className="bg-[#141618] border border-[#24272C] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[#24272C] bg-[#181A1C] flex justify-between items-center">
        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-widest">Bank Deposits</h3>
        <div className="flex gap-2">
          <button 
            onClick={handleNewDeposit}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            <Plus className="w-3 h-3" /> Record Deposit
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-400 font-mono">
          <thead className="bg-[#181A1C] border-b border-[#24272C] text-[10px] uppercase tracking-widest">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">From Cash / Custodian</th>
              <th className="p-3">To Bank Account</th>
              <th className="p-3">Deposit Slip</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {deposits.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500 italic">No bank deposits found.</td>
              </tr>
            ) : (
              deposits.map(d => {
                const cashAcc = allAccounts.find(a => a.id === d.fromCashAccountId);
                const bankAcc = allAccounts.find(a => a.id === d.toBankAccountId);
                const cust = allCustodians.find(u => u.id === d.fromCustodianId);
                return (
                  <tr key={d.id} className="border-b border-[#24272C] hover:bg-[#1D2024]">
                    <td className="p-3 font-bold text-white">{d.depositDate}</td>
                    <td className="p-3">
                      <div className="font-bold text-white">{cashAcc ? cashAcc.accountName : "Unknown"}</div>
                      <div className="text-[10px]">{cust ? cust.name : "Unknown Custodian"}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-white">{bankAcc ? bankAcc.accountName : "Unknown"}</div>
                      <div className="text-[10px]">{bankAcc ? bankAcc.bankName : ""}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-zinc-300 font-bold">{d.depositSlipNumber}</div>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-400">{formatPeso(d.depositAmount)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest font-bold ${
                        d.status === "Posted" || d.status === "Verified" ? "bg-emerald-900/50 text-emerald-400" : 
                        "bg-amber-900/50 text-amber-400"
                      }`}>
                        {d.status}
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
