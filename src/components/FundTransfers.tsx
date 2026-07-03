import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowRightLeft, FileCheck2, Plus, Clock, Search, ShieldCheck, User, Split, X
} from "lucide-react";
import { 
  FundTransfer, CashAccount, Company, Profile
} from "../types";
import { 
  getFundTransfers, saveFundTransfer, getCashAccounts, getCompanies, getProfiles, getUserRole,
  getAllCashAccounts, useDBUpdate, executeFundTransferToLedger, isGroupAdmin
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
  const [receivedAs, setReceivedAs] = useState<"sales" | "capital">("sales");

  const [editingRefId, setEditingRefId] = useState<string | null>(null);
  const [refValue, setRefValue] = useState("");

  const [isSplit, setIsSplit] = useState(false);
  const emptySplitRow = () => ({ toCompanyId: companyId === "all" ? "" : companyId, toAccountId: "", amount: "" });
  const [splitDestinations, setSplitDestinations] = useState<{ toCompanyId: string; toAccountId: string; amount: string }[]>([emptySplitRow(), emptySplitRow()]);

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

  const splitTotal = useMemo(() => {
    return splitDestinations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  }, [splitDestinations]);

  const updateSplitRow = (index: number, patch: Partial<{ toCompanyId: string; toAccountId: string; amount: string }>) => {
    setSplitDestinations(rows => rows.map((r, i) => {
      if (i !== index) return r;
      const next = { ...r, ...patch };
      if (patch.toCompanyId !== undefined && patch.toCompanyId !== r.toCompanyId) next.toAccountId = "";
      return next;
    }));
  };

  const addSplitRow = () => setSplitDestinations(rows => [...rows, emptySplitRow()]);
  const removeSplitRow = (index: number) => setSplitDestinations(rows => rows.length <= 2 ? rows : rows.filter((_, i) => i !== index));

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

    if (!fromCompanyId || !fromAccountId || !purpose) {
      toast.error("Please fill in all fields.");
      return;
    }

    const fromAccCheck = allAccounts.find(a => a.id === fromAccountId);

    if (isSplit) {
      if (splitDestinations.some(d => !d.toCompanyId || !d.toAccountId || !d.amount)) {
        toast.error("Please fill in every destination row, or remove unused ones.");
        return;
      }
      if (splitDestinations.some(d => d.toAccountId === fromAccountId)) {
        toast.error("Source and destination accounts must be different.");
        return;
      }
      const destAccountIds = splitDestinations.map(d => d.toAccountId);
      if (new Set(destAccountIds).size !== destAccountIds.length) {
        toast.error("Each destination account can only appear once.");
        return;
      }
      if (splitDestinations.some(d => isNaN(parseFloat(d.amount)) || parseFloat(d.amount) <= 0)) {
        toast.error("Every split amount must be greater than zero.");
        return;
      }
      if (fromAccCheck && splitTotal > fromAccCheck.currentBalance) {
        toast.error(`Insufficient funds in ${fromAccCheck.accountName}. Available: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(fromAccCheck.currentBalance)}`);
        return;
      }

      const splitGroupId = `FTSPLIT-${Date.now()}`;
      splitDestinations.forEach((d, i) => {
        const newTransfer: FundTransfer = {
          id: `FT-${Date.now()}-${i}`,
          requestDate: new Date().toISOString().split('T')[0],
          fromCompanyId,
          fromAccountId,
          toCompanyId: d.toCompanyId,
          toAccountId: d.toAccountId,
          amount: parseFloat(d.amount),
          purpose,
          receivedAs,
          requestedBy: userId,
          approvalRequired: true,
          status: "Pending",
          approvedBy: null,
          dateApproved: null,
          transferReferenceNumber: null,
          remarks: "",
          createdAt: new Date().toISOString(),
          splitGroupId,
        };
        saveFundTransfer(newTransfer, newTransfer.id);
      });

      toast.success(`Split fund transfer requested across ${splitDestinations.length} destinations.`);
    } else {
      if (!toCompanyId || !toAccountId || !amount) {
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

      if (fromAccCheck && amt > fromAccCheck.currentBalance) {
        toast.error(`Insufficient funds in ${fromAccCheck.accountName}. Available: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(fromAccCheck.currentBalance)}`);
        return;
      }

      const newTransfer: FundTransfer = {
        id: `FT-${Date.now()}`,
        requestDate: new Date().toISOString().split('T')[0],
        fromCompanyId,
        fromAccountId,
        toCompanyId,
        toAccountId,
        amount: amt,
        purpose,
        receivedAs,
        requestedBy: userId,
        approvalRequired: true,
        status: "Pending",
        approvedBy: null,
        dateApproved: null,
        transferReferenceNumber: null,
        remarks: "",
        createdAt: new Date().toISOString()
      };

      saveFundTransfer(newTransfer, newTransfer.id);
      toast.success("Fund transfer requested.");
    }

    setShowAddModal(false);
    setAmount("");
    setPurpose("");
    setReceivedAs("sales");
    setIsSplit(false);
    setSplitDestinations([emptySplitRow(), emptySplitRow()]);
    setForceRender(prev => prev + 1);
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
    
    if (newStatus === 'Completed') {
      const result = executeFundTransferToLedger(userId, updated);
      if (!result.success) {
        toast.error(result.error || 'The transfer could not be posted.');
        return;
      }
    }

    saveFundTransfer(updated, id);

    toast.success(`Transfer status updated to ${newStatus}.`);
    setForceRender(prev => prev + 1);
  };

  const handleSaveReference = (t: FundTransfer) => {
    if (!refValue.trim()) {
      toast.error("Reference number cannot be empty.");
      return;
    }
    saveFundTransfer({ ...t, transferReferenceNumber: refValue.trim() }, t.id);
    toast.success("Reference number saved.");
    setEditingRefId(null);
    setRefValue("");
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

  const isApprover = (transferCompanyId: string) => {
    if (isGroupAdmin(userId)) return true;
    const role = getUserRole(userId, transferCompanyId);
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
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {t.requestDate}
                          {t.splitGroupId && (
                            <span title="Part of a split transfer" className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                              <Split className="w-2.5 h-2.5" /> Split
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{t.id}</div>
                        {t.transferReferenceNumber && (
                          <div className="text-[9px] text-emerald-600 font-bold mt-0.5">Ref: {t.transferReferenceNumber}</div>
                        )}
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
                        {t.status === "Pending" && isApprover(t.fromCompanyId) && (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleUpdateStatus(t.id, 'Approved')} className="text-emerald-600 hover:underline">Approve</button>
                            <button onClick={() => handleUpdateStatus(t.id, 'Rejected')} className="text-rose-600 hover:underline">Reject</button>
                          </div>
                        )}
                        {t.status === "Approved" && isApprover(t.fromCompanyId) && (
                          <button onClick={() => handleUpdateStatus(t.id, 'Completed')} className="text-emerald-600 hover:underline">Mark Completed</button>
                        )}
                        {t.status === "Completed" && isApprover(t.fromCompanyId) && (
                          <div className="flex flex-col gap-1.5 items-end">
                            <button onClick={() => handleUpdateStatus(t.id, 'Completed')} className="text-sky-600 hover:underline">Sync Posting</button>
                            {!t.transferReferenceNumber && (
                              editingRefId === t.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={refValue}
                                    onChange={(e) => setRefValue(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveReference(t); if (e.key === 'Escape') { setEditingRefId(null); setRefValue(""); } }}
                                    placeholder="Bank/GCash ref #"
                                    className="w-28 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                                  />
                                  <button onClick={() => handleSaveReference(t)} className="text-emerald-600 hover:underline text-[11px]">Save</button>
                                  <button onClick={() => { setEditingRefId(null); setRefValue(""); }} className="text-slate-400 hover:text-slate-600 text-[11px]">Cancel</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingRefId(t.id); setRefValue(""); }}
                                  className="text-amber-600 hover:underline text-[11px]"
                                >
                                  + Add Reference #
                                </button>
                              )
                            )}
                          </div>
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
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">To Destination</h4>
                        <button
                          type="button"
                          onClick={() => setIsSplit(s => !s)}
                          className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition ${
                            isSplit ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          <Split className="w-3 h-3" /> Split
                        </button>
                      </div>
                      {!isSplit && (
                        <>
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
                        </>
                      )}
                      {isSplit && (
                        <p className="text-xs text-slate-500 font-mono">
                          One source, split across multiple destinations below.
                        </p>
                      )}
                    </div>
                  </div>

                  {isSplit && (
                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Split Destinations</h4>
                        <div className="text-xs font-mono text-slate-600">
                          Total: <span className="font-bold text-slate-900">{formatPeso(splitTotal)}</span>
                        </div>
                      </div>
                      {splitDestinations.map((row, i) => {
                        const rowAccounts = allAccounts.filter(a => a.companyId === row.toCompanyId);
                        return (
                          <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-2 items-end bg-white border border-slate-200 rounded-xl p-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Company</label>
                              <select
                                value={row.toCompanyId}
                                onChange={(e) => updateSplitRow(i, { toCompanyId: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                                required
                              >
                                <option value="">Select Company...</option>
                                {allCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Account</label>
                              <select
                                value={row.toAccountId}
                                onChange={(e) => updateSplitRow(i, { toAccountId: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                                required
                                disabled={!row.toCompanyId}
                              >
                                <option value="">Select Account...</option>
                                {rowAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName} ({a.bankName})</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Amount</label>
                              <input
                                type="number"
                                step="0.01"
                                value={row.amount}
                                onChange={(e) => updateSplitRow(i, { amount: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden font-mono"
                                placeholder="0.00"
                                required
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSplitRow(i)}
                              disabled={splitDestinations.length <= 2}
                              className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              title="Remove destination"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={addSplitRow}
                        className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-500 transition"
                      >
                        <Plus className="w-3 h-3" /> Add Destination
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">
                        {isSplit ? "Total Amount (PHP)" : "Amount (PHP)"}
                      </label>
                      {isSplit ? (
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 font-mono">
                          {formatPeso(splitTotal)}
                        </div>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden font-mono"
                          placeholder="0.00"
                          required
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Received As</label>
                      <select
                        value={receivedAs}
                        onChange={(e) => setReceivedAs(e.target.value as "sales" | "capital")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        required
                      >
                        <option value="sales">Sales</option>
                        <option value="capital">Capital</option>
                      </select>
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
