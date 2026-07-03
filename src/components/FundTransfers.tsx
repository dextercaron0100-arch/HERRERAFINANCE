import React, { useState, useMemo, useEffect } from "react";
import { 
  ArrowRightLeft, FileCheck2, Plus, Clock, Search, ShieldCheck, User
} from "lucide-react";
import { 
  FundTransfer, CashAccount, Company, Profile
} from "../types";
import { 
  getFundTransfers, saveFundTransfer, getCashAccounts, getCompanies, getProfiles, getUserRole,
  getAllCashAccounts, useDBUpdate, executeFundTransferToLedger
} from "../data/mockDatabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  userId: string;
  companyId: string;
}

export default function FundTransfers({ userId, companyId }: Props) {
  const dbTick = useDBUpdate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [forceRender, setForceRender] = useState(0);

  const [fromCompanyId, setFromCompanyId] = useState(companyId === "all" ? "" : companyId);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toCompanyId, setToCompanyId] = useState(companyId === "all" ? "" : companyId);
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");

  const allCompanies = getCompanies();
  const allAccounts = getAllCashAccounts();
  const allProfiles = getProfiles();
  const transfers = getFundTransfers(companyId);

  useEffect(() => {
    setForceRender(prev => prev + 1);
  }, [companyId, dbTick]);

  const fromCompanyAccounts = useMemo(() => {
    return allAccounts.filter(a => a.companyId === fromCompanyId);
  }, [allAccounts, fromCompanyId]);

  const toCompanyAccounts = useMemo(() => {
    return allAccounts.filter(a => a.companyId === toCompanyId);
  }, [allAccounts, toCompanyId]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      const matchSearch = t.purpose.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.amount.toString().includes(searchTerm) ||
                          t.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transfers, searchTerm]);

  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCompanyId || !fromAccountId || !toCompanyId || !toAccountId || !amount || !purpose) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (fromAccountId === toAccountId) {
      toast.error("Source and destination accounts must be different.");
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Amount must be greater than zero.");
      return;
    }

    const fromAccCheck = allAccounts.find(a => a.id === fromAccountId);
    if (fromAccCheck && amt > fromAccCheck.currentBalance) {
      toast.error(`Insufficient funds in ${fromAccCheck.accountName}. Available: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(fromAccCheck.currentBalance)}`);
      return;
    }

    const needsApproval = fromCompanyId !== toCompanyId || amt >= 50000;
    const isApproved = !needsApproval;

    const newTransfer: FundTransfer = {
      id: `FT-${Date.now()}`,
      requestDate: new Date().toISOString().split('T')[0],
      fromCompanyId,
      fromAccountId,
      toCompanyId,
      toAccountId,
      amount: amt,
      purpose,
      requestedBy: userId,
      approvalRequired: needsApproval,
      status: isApproved ? "Approved" : "Pending",
      approvedBy: isApproved ? userId : null,
      dateApproved: isApproved ? new Date().toISOString() : null,
      transferReferenceNumber: null,
      remarks: "",
      createdAt: new Date().toISOString()
    };

    saveFundTransfer(newTransfer, newTransfer.id);

    toast.success("Fund transfer requested.");
    setShowAddModal(false);
    setAmount("");
    setPurpose("");
    setForceRender(prev => prev + 1);
  };

  const postTransferToLedger = (t: FundTransfer) => {
    executeFundTransferToLedger(userId, t);
  };

  const handleUpdateStatus = (id: string, newStatus: FundTransfer['status']) => {
    const transfer = transfers.find(t => t.id === id);
    if (!transfer) return;

    if (newStatus === 'Approved') {
      const fromAccCheck = allAccounts.find(a => a.id === transfer.fromAccountId);
      if (fromAccCheck && transfer.amount > fromAccCheck.currentBalance) {
        toast.error(`Insufficient funds in ${fromAccCheck.accountName}. Available: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(fromAccCheck.currentBalance)}`);
        return;
      }
    }

    const updated = {
      ...transfer,
      status: newStatus,
      approvedBy: newStatus === 'Approved' ? userId : transfer.approvedBy,
      dateApproved: newStatus === 'Approved' ? new Date().toISOString() : transfer.dateApproved,
    };
    
    saveFundTransfer(updated, id);

    if (newStatus === 'Completed') {
      postTransferToLedger(updated);
    }

    toast.success(`Transfer status updated to ${newStatus}.`);
    setForceRender(prev => prev + 1);
  };

  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let completed = 0;

    transfers.forEach(t => {
      if (t.status === "Pending") pending += t.amount;
      else if (t.status === "Approved") approved += t.amount;
      else if (t.status === "Completed") completed += t.amount;
    });

    return { pending, approved, completed };
  }, [transfers]);

  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
  };

  const isApprover = () => {
    const role = getUserRole(userId, companyId);
    return role === "company_admin" || role === "approver" || role === "owner";
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Pending Approval</div>
          <div className="text-2xl font-bold text-amber-500 mt-2">{formatPeso(stats.pending)}</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Approved (Not Completed)</div>
          <div className="text-2xl font-bold text-sky-500 mt-2">{formatPeso(stats.approved)}</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Completed Transfers</div>
          <div className="text-2xl font-bold text-emerald-500 mt-2">{formatPeso(stats.completed)}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search transfers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden rounded-xl transition hover:bg-slate-100"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Request Transfer
        </button>
      </div>

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        {filteredTransfers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ArrowRightLeft className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
            <p className="font-mono text-sm">No fund transfers found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 font-mono whitespace-nowrap">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4">Date & ID</th>
                  <th className="p-4">From</th>
                  <th className="p-4">To</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4">Purpose</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransfers.map((t) => {
                  const fromCo = allCompanies.find(c => c.id === t.fromCompanyId)?.name || 'Unknown';
                  const toCo = allCompanies.find(c => c.id === t.toCompanyId)?.name || 'Unknown';
                  const fromAcc = allAccounts.find(a => a.id === t.fromAccountId)?.accountName || 'Unknown';
                  const toAcc = allAccounts.find(a => a.id === t.toAccountId)?.accountName || 'Unknown';
                  const reqUser = allProfiles.find(p => p.id === t.requestedBy)?.fullName || 'Unknown';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{t.requestDate}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{t.id}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-700">{fromAcc}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{fromCo}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-700">{toAcc}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{toCo}</div>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900">
                        {formatPeso(t.amount)}
                      </td>
                      <td className="p-4">
                        <div className="truncate max-w-[150px] font-sans text-sm">{t.purpose}</div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5">
                          <User className="w-3 h-3" /> {reqUser}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          t.status === "Pending" ? "bg-amber-100 text-amber-700" :
                          t.status === "Approved" ? "bg-sky-100 text-sky-700" :
                          t.status === "Rejected" ? "bg-rose-100 text-rose-700" :
                          "bg-emerald-100 text-emerald-700"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {t.status === "Pending" && isApprover() && (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleUpdateStatus(t.id, 'Approved')} className="text-emerald-600 hover:underline">Approve</button>
                            <button onClick={() => handleUpdateStatus(t.id, 'Rejected')} className="text-rose-600 hover:underline">Reject</button>
                          </div>
                        )}
                        {t.status === "Approved" && (
                          <button onClick={() => handleUpdateStatus(t.id, 'Completed')} className="text-emerald-600 hover:underline">Mark Completed</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-emerald-500" />
                  Request Fund Transfer
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition"
                >
                  <Clock className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="transfer-form" onSubmit={handleSaveTransfer} className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">From Source</h4>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Company</label>
                        <select
                          value={fromCompanyId}
                          onChange={(e) => setFromCompanyId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                          required
                        >
                          <option value="">Select Company...</option>
                          {allCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Account</label>
                        <select
                          value={fromAccountId}
                          onChange={(e) => setFromAccountId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                          required
                          disabled={!fromCompanyId}
                        >
                          <option value="">Select Account...</option>
                          {fromCompanyAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName} ({a.bankName})</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">To Destination</h4>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Company</label>
                        <select
                          value={toCompanyId}
                          onChange={(e) => setToCompanyId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                          required
                        >
                          <option value="">Select Company...</option>
                          {allCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Account</label>
                        <select
                          value={toAccountId}
                          onChange={(e) => setToAccountId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                          required
                          disabled={!toCompanyId}
                        >
                          <option value="">Select Account...</option>
                          {toCompanyAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName} ({a.bankName})</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Amount (PHP)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden font-mono"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Purpose / Remarks</label>
                      <input
                        type="text"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        placeholder="e.g. Replenishment, Intercompany Loan"
                        required
                      />
                    </div>
                  </div>
                  
                </form>
              </div>
              
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold transition uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="transfer-form"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition uppercase tracking-wider shadow-sm"
                >
                  Submit Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
