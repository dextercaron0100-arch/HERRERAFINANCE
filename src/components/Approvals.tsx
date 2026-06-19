import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileSignature,
  CheckCircle,
  XCircle,
  Search,
  AlertTriangle,
  FileCheck2,
  Clock,
  User,
} from "lucide-react";
import {
  getTransactions,
  reviewTransaction,
  getUserRole,
  isGroupAdmin,
  getCategories,
  getApprovals,
  getProfiles,
} from "../data/mockDatabase";
import { Transaction } from "../types";
import { toast } from "sonner";

interface ApprovalsProps {
  userId: string;
  companyId: string;
  onAuditLogged?: () => void;
}

export default function Approvals({
  userId,
  companyId,
  onAuditLogged,
}: ApprovalsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"pending" | "history">("pending");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");

  const transactions = getTransactions(userId, companyId);
  const categories = getCategories(companyId);
  const profiles = getProfiles();

  const pendingTxns = useMemo(() => {
    return transactions.filter((t) => t.status === "pending");
  }, [transactions]);

  const historyTxns = useMemo(() => {
    return transactions.filter((t) => t.status !== "pending");
  }, [transactions]);

  const filteredTxns = useMemo(() => {
    const list = viewMode === "pending" ? pendingTxns : historyTxns;
    if (!searchTerm) return list;
    const lower = searchTerm.toLowerCase();
    return list.filter(
      (t) =>
        t.purpose.toLowerCase().includes(lower) ||
        t.amount.toString().includes(lower),
    );
  }, [pendingTxns, historyTxns, viewMode, searchTerm]);

  const userRole = getUserRole(userId, companyId);
  const isAuthorizedApprover =
    userRole === "approver" ||
    userRole === "company_admin" ||
    isGroupAdmin(userId);

  const handleAction = (action: "approved" | "rejected") => {
    if (!selectedTxn) return;

    if (
      action === "rejected" &&
      (!reviewRemarks || reviewRemarks.trim() === "")
    ) {
      toast.error("Remarks required", {
        description: "You must provide remarks when rejecting a transaction.",
      });
      return;
    }

    const { error } = reviewTransaction(
      userId,
      selectedTxn.id,
      action,
      action === "rejected" ? reviewRemarks : reviewRemarks || null,
    );

    if (error) {
      toast.error("Action Failed", { description: error });
    } else {
      toast.success(
        `Transaction ${action === "approved" ? "Approved" : "Rejected"}`,
        {
          description: `Successfully ${action} transaction in ledger.`,
        },
      );
      setSelectedTxn(null);
      setReviewRemarks("");
      if (onAuditLogged) onAuditLogged();
    }
  };

  const timelineItems = useMemo(() => {
    if (!selectedTxn) return [];
    const items = [];
    
    // Step 1: Requested
    const requester = profiles.find(p => p.id === selectedTxn.encodedBy)?.fullName || selectedTxn.encodedBy;
    items.push({
      id: "step-1",
      type: "requested",
      title: "Request Submitted",
      description: `Submitted by ${requester}`,
      date: new Date(selectedTxn.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      icon: <User className="w-4 h-4 text-sky-400" />,
      color: "bg-sky-500/10 text-sky-400 border border-sky-500/30",
      lineColor: "bg-sky-500/30",
    });

    // Approvals
    const txnApprovals = getApprovals(selectedTxn.id);
    txnApprovals.forEach((app, idx) => {
      const approver = profiles.find(p => p.id === app.approverId)?.fullName || app.approverId;
      const isApproved = app.action === "approved";
      items.push({
        id: `app-${idx}`,
        type: app.action,
        title: isApproved ? "Request Approved" : "Request Rejected",
        description: `Reviewed by ${approver}${app.remarks ? ` — "${app.remarks}"` : ""}`,
        date: new Date(app.createdAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        }),
        icon: isApproved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-450" />,
        color: isApproved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/10 text-rose-450 border border-rose-500/30",
        lineColor: isApproved ? "bg-emerald-500/30" : "bg-rose-500/30",
      });
    });

    // Current status if still pending
    if (selectedTxn.status === "pending") {
       items.push({
        id: "pending-step",
        type: "pending",
        title: "Pending Review",
        description: "Waiting for approver action",
        date: "",
        icon: <Clock className="w-4 h-4 text-amber-500" />,
        color: "bg-amber-500/10 text-amber-500 border border-amber-500/30",
        lineColor: "bg-transparent",
      });
    }

    return items;
  }, [selectedTxn, profiles]);

  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-amber-500" />
            Approvals Queue
          </h2>
          <p className="text-zinc-500 text-sm font-mono mt-1">
            Review and clear pending transactions for general ledger
            integration.
          </p>
        </div>
      </div>

      {!isAuthorizedApprover && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 flex-col sm:flex-row">
          <AlertTriangle className="w-5 h-5 text-rose-450 shrink-0 mt-0.5" />
          <div className="text-rose-200 text-sm">
            <strong className="block text-rose-400 font-bold mb-1">
              Access Restricted
            </strong>
            You do not have Approver clearance to review transactions. You may
            only view the pending queue.
          </div>
        </div>
      )}

      {/* DASHBOARD WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#141618] border border-[#24272C] rounded-2xl p-5 shadow-inner">
          <div className="text-xs uppercase font-bold text-zinc-500 mb-1 tracking-wider">
            Pending Approvals
          </div>
          <div className="text-3xl font-display font-light text-amber-500">
            {pendingTxns.length}
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[#141618] border border-[#24272C] p-4 rounded-2xl">
        <div className="flex bg-[#181A1C] border border-[#24272C] rounded-xl p-1 gap-1">
          <button
            onClick={() => setViewMode("pending")}
            className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${
              viewMode === "pending"
                ? "bg-[#24272C] text-white shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${
              viewMode === "history"
                ? "bg-[#24272C] text-white shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            History
          </button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by purpose or amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#181A1C] border border-[#24272C] text-sm text-white focus:ring-1 focus:ring-amber-500 focus:outline-hidden rounded-xl transition hover:bg-[#1D2024]"
          />
        </div>
      </div>

      {/* PENDING LIST */}
      <div className="bg-[#141618] border border-[#24272C] rounded-2xl overflow-hidden shadow-xl">
        {filteredTxns.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <FileCheck2 className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
            <p className="font-mono text-sm">
              {viewMode === "pending" ? "Queue is empty. No pending transactions." : "No approval history found for this company."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#24272C]">
            <AnimatePresence initial={false}>
              {filteredTxns.map((txn, idx) => {
                const category = categories.find(
                  (c) => c.id === txn.categoryId,
                );
                return (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    transition={{ delay: idx * 0.05, duration: 0.2 }}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:bg-[#181A1C] transition"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-500 bg-[#181A1C] px-2 py-1 rounded border border-[#24272C]">
                          {txn.txnDate}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded ${
                            txn.type === "cash_in"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-450 border border-rose-500/20"
                          }`}
                        >
                          {txn.type === "cash_in" ? "Inflow" : "Outflow"}
                        </span>
                        {txn.receiptPath && (
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#00B67A] bg-[#00B67A]/10 px-2 py-1 rounded border border-[#00B67A]/20">
                            Receipt Found
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm leading-snug">
                          {txn.purpose}
                        </h4>
                        <p className="text-sm font-mono text-zinc-400 mt-1">
                          Cat: {category?.name || txn.categoryId} | By:{" "}
                          {txn.encodedBy}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-8 w-full lg:w-auto">
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-0.5">
                          Amount Scheduled
                        </div>
                        <div
                          className={`font-mono text-lg font-bold ${txn.type === "cash_in" ? "text-emerald-400" : "text-rose-450"}`}
                        >
                          {formatPeso(txn.amount)}
                        </div>
                      </div>

                      {isAuthorizedApprover && (
                        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          {viewMode === "history" ? (
                            <button
                              onClick={() => {
                                setSelectedTxn(txn);
                                setReviewRemarks("");
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 bg-zinc-500/10 text-zinc-300 hover:bg-zinc-500 hover:text-white border border-zinc-500/30 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
                            >
                              Timeline
                            </button>
                          ) : txn.encodedBy === userId ? (
                            <div className="text-[10px] text-amber-500/80 font-mono tracking-widest uppercase bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 text-center w-full leading-tight">
                              Self-Encoded
                              <br />
                              Conflict
                            </div>
                          ) : txn.amount > 50000 && userRole !== "company_admin" && !isGroupAdmin(userId) ? (
                            <div className="text-[10px] text-rose-400 font-mono tracking-widest uppercase bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 text-center w-full leading-tight">
                              Requires
                              <br />
                              Company Admin
                            </div>
                          ) : txn.amount > 10000 && userRole === "approver" && !isGroupAdmin(userId) ? (
                            <div className="text-[10px] text-orange-400 font-mono tracking-widest uppercase bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20 text-center w-full leading-tight">
                              Requires
                              <br />
                              Finance Officer
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedTxn(txn);
                                setReviewRemarks("");
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/30 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
                            >
                              Review
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* REVIEW MODAL */}
      <AnimatePresence>
        {selectedTxn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              className="bg-[#141618] border border-[#24272C] rounded-2xl w-full max-w-lg shadow-2xl p-6 relative"
            >
              <h3 className="text-xl font-bold font-display text-white mb-2">
                {selectedTxn.status === "pending" ? "Review Transaction" : "Transaction Timeline"}
              </h3>
              <div className="text-sm text-zinc-400 mb-6 bg-[#181A1C] p-3 rounded-xl border border-[#24272C] font-mono">
                <strong className="text-zinc-300 block mb-1">
                  {selectedTxn.purpose}
                </strong>
                Amount:{" "}
                <strong
                  className={
                    selectedTxn.type === "cash_in"
                      ? "text-emerald-400"
                      : "text-rose-450"
                  }
                >
                  {formatPeso(selectedTxn.amount)}
                </strong>
              </div>

              {/* TIMELINE */}
              <div className="mb-6 bg-[#181A1C] border border-[#24272C] p-4 rounded-xl">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-4 font-mono">
                  Approval History
                </h4>
                <div className="space-y-0 relative">
                  {timelineItems.map((item, idx) => (
                    <div key={item.id} className="group relative flex items-start gap-4 pb-6 last:pb-0">
                       {/* Connection Line */}
                       {idx !== timelineItems.length - 1 && (
                         <div className={`absolute top-6 bottom-[-6px] left-[15px] w-[2px] ${item.lineColor}`}></div>
                       )}
                       {/* Icon */}
                       <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.color}`}>
                          {item.icon}
                       </div>
                       {/* Content */}
                       <div className="flex-1 min-w-0 pt-1">
                         <div className="flex items-center gap-2 justify-between">
                            <span className="text-sm font-bold text-white tracking-tight">{item.title}</span>
                            {item.date && (
                              <span className="text-[10px] font-mono text-zinc-500 shrink-0">{item.date}</span>
                            )}
                         </div>
                         <p className="text-sm text-zinc-400 mt-0.5 leading-snug break-words">
                            {item.description}
                         </p>
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTxn.status === "pending" && (
                <div className="space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block font-mono">
                      Review Remarks & Comments (Required for Reject)
                    </label>
                    <textarea
                      rows={3}
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                      placeholder="e.g., Authorized per budget or Missing valid invoice..."
                      className="w-full px-3 py-2 bg-[#181A1C] border border-[#24272C] text-sm text-white focus:outline-hidden focus:border-amber-500 rounded-xl resize-none font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-[#24272C]">
                {selectedTxn.status === "pending" ? (
                  <>
                    <button
                      onClick={() => setSelectedTxn(null)}
                      className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-bold tracking-wider text-xs uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAction("rejected")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-450 hover:bg-rose-500 border border-rose-500/30 hover:text-white font-bold tracking-wider text-xs uppercase transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleAction("approved")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 border border-emerald-500/30 hover:text-white font-bold tracking-wider text-xs uppercase transition cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSelectedTxn(null)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white font-bold tracking-wider text-xs uppercase cursor-pointer hover:bg-zinc-700 transition"
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
