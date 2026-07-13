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
  Filter,
  Eye,
  X,
} from "lucide-react";
import {
  getTransactions,
  reviewTransaction,
  getUserRole,
  isGroupAdmin,
  getCategories,
  getApprovals,
  getProfiles,
  getCompanies,
  getAllCashAccounts,
  getRoles,
  getFundTransfers,
  saveFundTransfer,
  useDBUpdate,
} from "../data/mockDatabase";
import { FundTransfer, Transaction } from "../types";
import { toast } from "sonner";

import AttachmentViewer from "./AttachmentViewer";

interface ApprovalsProps {
  userId: string;
  companyId: string;
  onAuditLogged?: () => void;
}

// Distinct, stable badge colors per company so companies don't get confused with each other.
const COMPANY_BADGE_COLORS = [
  "text-violet-500 bg-violet-500/10 border-violet-500/20",
  "text-orange-500 bg-orange-500/10 border-orange-500/20",
  "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20",
  "text-lime-600 bg-lime-500/10 border-lime-500/20",
  "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  "text-pink-500 bg-pink-500/10 border-pink-500/20",
  "text-cyan-600 bg-cyan-500/10 border-cyan-500/20",
  "text-yellow-600 bg-yellow-500/10 border-yellow-500/20",
];

function getCompanyBadgeColor(companyId: string): string {
  let hash = 0;
  for (let i = 0; i < companyId.length; i++) {
    hash = (hash * 31 + companyId.charCodeAt(i)) >>> 0;
  }
  return COMPANY_BADGE_COLORS[hash % COMPANY_BADGE_COLORS.length];
}

export default function Approvals({
  userId,
  companyId,
  onAuditLogged,
}: ApprovalsProps) {
  useDBUpdate();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "cash_in" | "cash_out">("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"pending" | "history">("pending");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [selectedTxns, setSelectedTxns] = useState<Set<string>>(new Set());
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  const transactions = getTransactions(userId, companyId);
  const categories = getCategories(companyId);
  const profiles = getProfiles();
  const allCompanies = getCompanies();
  const allAccounts = getAllCashAccounts();
  const fundTransfers = getFundTransfers(companyId);

  const currentUser = profiles.find((p) => p.id === userId);
  const isOwner = currentUser && ["mark@herrera.com", "ryan@herrera.com", "marvin@herrera.com"].includes(currentUser.email);

  const pendingTxns = useMemo(() => {
    return transactions.filter((t) => t.status === "pending");
  }, [transactions]);

  const historyTxns = useMemo(() => {
    return transactions.filter((t) => t.status !== "pending");
  }, [transactions]);

  const visibleFundTransfers = useMemo(() => {
    const expectedStatus = viewMode === "pending" ? "Pending" : null;
    const lower = searchTerm.toLowerCase();
    return fundTransfers.filter(transfer => {
      const matchesView = expectedStatus
        ? transfer.status === expectedStatus
        : transfer.status !== "Pending";
      const matchesSearch = !lower ||
        transfer.purpose.toLowerCase().includes(lower) ||
        transfer.amount.toString().includes(lower) ||
        transfer.id.toLowerCase().includes(lower);
      return matchesView && matchesSearch;
    });
  }, [fundTransfers, viewMode, searchTerm]);

  const pendingFundTransfers = fundTransfers.filter(t => t.status === "Pending");

  const filteredTxns = useMemo(() => {
    let list = viewMode === "pending" ? pendingTxns : historyTxns;

    if (filterType !== "all") {
      list = list.filter((t) => t.type === filterType);
    }
    if (filterStartDate) {
      list = list.filter((t) => t.txnDate >= filterStartDate);
    }
    if (filterEndDate) {
      list = list.filter((t) => t.txnDate <= filterEndDate);
    }
    if (filterMinAmount) {
      const min = parseFloat(filterMinAmount);
      if (!isNaN(min)) list = list.filter((t) => t.amount >= min);
    }
    if (filterMaxAmount) {
      const max = parseFloat(filterMaxAmount);
      if (!isNaN(max)) list = list.filter((t) => t.amount <= max);
    }

    if (!searchTerm) return list;
    const lower = searchTerm.toLowerCase();
    return list.filter(
      (t) =>
         t.purpose.toLowerCase().includes(lower) ||
         t.amount.toString().includes(lower),
    );
  }, [pendingTxns, historyTxns, viewMode, searchTerm, filterType, filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount]);

  const userRole = getUserRole(userId, companyId);
  
  // Checks if the user is authorized as an approver for the active company or ANY company in the system if in consolidated view
  const isAuthorizedApprover = useMemo(() => {
    if (isGroupAdmin(userId)) return true;
    if (companyId && companyId !== "all") {
      const role = getUserRole(userId, companyId);
      return role === "approver" || role === "company_admin";
    }
    const roles = getRoles().filter((r) => r.userId === userId);
    return roles.some((r) => r.role === "approver" || r.role === "company_admin");
  }, [userId, companyId]);

  // Evaluates precise permission criteria for a specific transaction record
  const getTxnPermissions = (txn: Transaction) => {
    const txnRole = getUserRole(userId, txn.companyId);
    const txnIsAuthorized =
      txnRole === "approver" ||
      txnRole === "company_admin" ||
      isGroupAdmin(userId);
      
    const canApprove =
      txnIsAuthorized &&
      !((txn.encodedBy === userId && !isOwner) ||
        (txn.amount > 50000 && txnRole !== "company_admin" && !isGroupAdmin(userId)) ||
        (txn.amount > 10000 && txnRole === "approver" && !isGroupAdmin(userId)));

    return {
      txnRole,
      txnIsAuthorized,
      canApprove,
    };
  };

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
      setSelectedTxns(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedTxn.id);
        return newSet;
      });
      setReviewRemarks("");
      if (onAuditLogged) onAuditLogged();
    }
  };

  const handleFundTransferAction = (
    transfer: FundTransfer,
    action: "Approved" | "Rejected",
  ) => {
    const role = getUserRole(userId, transfer.fromCompanyId);
    const canReview = isGroupAdmin(userId) || role === "company_admin" || role === "approver";
    if (!canReview) {
      toast.error("You are not authorized to review this fund transfer.");
      return;
    }
    if (transfer.requestedBy === userId && !isGroupAdmin(userId)) {
      toast.error("You cannot approve your own fund transfer request.");
      return;
    }

    saveFundTransfer({
      ...transfer,
      status: action,
      approvedBy: action === "Approved" ? userId : transfer.approvedBy,
      dateApproved: action === "Approved" ? new Date().toISOString() : transfer.dateApproved,
    }, transfer.id);
    toast.success(`Fund transfer ${action.toLowerCase()}.`);
  };

  const handleBulkAction = (action: "approved" | "rejected") => {
    if (selectedTxns.size === 0) return;

    if (
      action === "rejected" &&
      (!reviewRemarks || reviewRemarks.trim() === "")
    ) {
      toast.error("Remarks required", {
        description: "You must provide remarks when rejecting transactions.",
      });
      setShowBulkRejectModal(true);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    Array.from(selectedTxns).forEach(txnId => {
      const { error } = reviewTransaction(
        userId,
        txnId,
        action,
        action === "rejected" ? reviewRemarks : reviewRemarks || null,
      );
      if (error) {
        failCount++;
      } else {
        successCount++;
      }
    });

    if (successCount > 0) {
      toast.success(
        `Bulk Action Complete`,
        {
          description: `Successfully ${action} ${successCount} transactions.`,
        },
      );
      setSelectedTxns(new Set());
      setReviewRemarks("");
      setShowBulkRejectModal(false);
      if (onAuditLogged) onAuditLogged();
    }
    
    if (failCount > 0) {
      toast.error("Bulk Action Errors", { description: `Failed to process ${failCount} transactions.` });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedTxns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTxns.size === filteredTxns.length) {
      setSelectedTxns(new Set());
    } else {
      const newSet = new Set<string>();
      filteredTxns.forEach(t => {
        // Only allow selection of items we can approve
        const canApprove = viewMode === "pending" && isAuthorizedApprover && 
            !((t.encodedBy === userId && !isOwner) || 
              (t.amount > 50000 && userRole !== "company_admin" && !isGroupAdmin(userId)) || 
              (t.amount > 10000 && userRole === "approver" && !isGroupAdmin(userId)));
              
        if (canApprove) {
          newSet.add(t.id);
        }
      });
      setSelectedTxns(newSet);
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
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900 flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-amber-500" />
            Approvals Queue
            <AnimatePresence>
              {selectedTxns.size > 0 && viewMode === "pending" && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="ml-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold border border-amber-500/20 shadow-sm"
                >
                  {selectedTxns.size} Selected
                </motion.span>
              )}
            </AnimatePresence>
          </h2>
          <p className="text-slate-500 text-sm font-mono mt-1">
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
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-inner">
          <div className="text-xs uppercase font-bold text-slate-500 mb-1 tracking-wider">
            Pending Approvals
          </div>
          <div className="text-3xl font-display font-light text-amber-500">
            {pendingTxns.length + pendingFundTransfers.length}
          </div>
        </div>
      </div>

      {visibleFundTransfers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 bg-sky-50 border-b border-sky-100">
            <h3 className="font-bold text-sky-900">Cash Flow & Fund Transfers</h3>
            <p className="text-xs text-sky-700 mt-1">Transfer requests included in the approval queue.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleFundTransfers.map(transfer => {
              const sourceCompany = allCompanies.find(c => c.id === transfer.fromCompanyId)?.name || "Unknown";
              const destinationCompany = allCompanies.find(c => c.id === transfer.toCompanyId)?.name || "Unknown";
              const sourceAccount = allAccounts.find(a => a.id === transfer.fromAccountId)?.accountName || "Unknown";
              const destinationAccount = allAccounts.find(a => a.id === transfer.toAccountId)?.accountName || "Unknown";
              const role = getUserRole(userId, transfer.fromCompanyId);
              const canReview = isGroupAdmin(userId) || role === "company_admin" || role === "approver";
              return (
                <div key={transfer.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{transfer.purpose}</span>
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-bold uppercase">Fund Transfer</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {sourceCompany} / {sourceAccount} → {destinationCompany} / {destinationAccount}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-sky-600 mt-1">Received as: {transfer.receivedAs || "Sales"}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{transfer.id} · {transfer.requestDate}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-bold text-slate-900">{formatPeso(transfer.amount)}</div>
                    {viewMode === "pending" && canReview ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleFundTransferAction(transfer, "Approved")} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">Approve</button>
                        <button onClick={() => handleFundTransferAction(transfer, "Rejected")} className="px-3 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold">Reject</button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold uppercase text-slate-500">{transfer.status}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEARCH AND FILTER */}
      <div className="flex flex-col gap-4 bg-white border border-slate-200 p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode("pending")}
              className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${
                viewMode === "pending"
                  ? "bg-slate-50 text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${
                viewMode === "history"
                  ? "bg-slate-50 text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              History
            </button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by purpose or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 text-sm text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-hidden rounded-xl transition hover:bg-slate-50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-xl flex items-center justify-center gap-2 transition-colors ${showFilters ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Filters</span>
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Type</label>
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="all">All Types</option>
                    <option value="cash_in">Inflow / Gross Sales</option>
                    <option value="cash_out">Outflow (Cash Out)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Start Date</label>
                  <input 
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">End Date</label>
                  <input 
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Min Amount</label>
                  <input 
                    type="number"
                    placeholder="0.00"
                    value={filterMinAmount}
                    onChange={(e) => setFilterMinAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Max Amount</label>
                  <input 
                    type="number"
                    placeholder="99999.00"
                    value={filterMaxAmount}
                    onChange={(e) => setFilterMaxAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PENDING LIST */}
      <div className="space-y-4">
        {selectedTxns.size > 0 && viewMode === "pending" && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
          >
            <div className="text-amber-900 text-sm font-medium">
              <span className="font-bold text-amber-700">{selectedTxns.size}</span> transaction(s) selected
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleBulkAction("approved")}
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all uppercase tracking-wider shadow-sm"
              >
                Approve Selected
              </button>
              <button
                onClick={() => setShowBulkRejectModal(true)}
                className="flex-1 sm:flex-none px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all uppercase tracking-wider shadow-sm"
              >
                Reject Selected
              </button>
            </div>
          </motion.div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
          {viewMode === "pending" && filteredTxns.length > 0 && isAuthorizedApprover && (
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTxns.size > 0 && selectedTxns.size === filteredTxns.filter(t => !((t.encodedBy === userId && !isOwner) || (t.amount > 50000 && userRole !== "company_admin" && !isGroupAdmin(userId)) || (t.amount > 10000 && userRole === "approver" && !isGroupAdmin(userId)))).length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Select All Valid</span>
              </label>
            </div>
          )}
          {filteredTxns.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileCheck2 className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
              <p className="font-mono text-sm">
                {viewMode === "pending" ? "Queue is empty. No pending transactions." : "No approval history found for this company."}
              </p>
            </div>
          ) : (
          <div className="divide-y divide-slate-200">
            <AnimatePresence initial={false}>
              {filteredTxns.map((txn, idx) => {
                const category = categories.find(
                  (c) => c.id === txn.categoryId,
                );
                const company = allCompanies.find((c) => c.id === txn.companyId);
                const account = allAccounts.find((a) => a.id === txn.cashAccountId);

                return (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    transition={{ delay: idx * 0.05, duration: 0.2 }}
                    className={`p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition ${selectedTxns.has(txn.id) ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex-1 flex items-start gap-4">
                      {viewMode === "pending" && isAuthorizedApprover && (
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={selectedTxns.has(txn.id)}
                            onChange={() => toggleSelection(txn.id)}
                            className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={
                              (txn.encodedBy === userId && !isOwner) ||
                              (txn.amount > 50000 && userRole !== "company_admin" && !isGroupAdmin(userId)) ||
                              (txn.amount > 10000 && userRole === "approver" && !isGroupAdmin(userId))
                            }
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
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
                          <button
                            onClick={() => setPreviewReceiptUrl(txn.receiptPath)}
                            className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-[#00B67A] bg-[#00B67A]/10 px-2 py-1 rounded border border-[#00B67A]/20 hover:bg-[#00B67A]/20 transition"
                            title="View Receipt Attachment"
                          >
                            <Eye className="w-3 h-3" />
                            Receipt Found
                          </button>
                        )}
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded border ${getCompanyBadgeColor(txn.companyId)}`}>
                          {company?.name || company?.code || txn.companyId}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20 truncate max-w-[200px]" title={`${account?.accountType || 'Wallet'} • ${account?.bankName || 'Unknown'} - ${account?.accountName || txn.cashAccountId}`}>
                          {account?.accountType || 'Wallet'} • {account?.bankName || 'Unknown'} - {account?.accountName || txn.cashAccountId}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-slate-900 font-medium text-sm leading-snug">
                          {txn.purpose}
                        </h4>
                        <p className="text-sm font-mono text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                          <span>Cat: {category?.name || txn.categoryId}</span>
                          <span className="text-zinc-600">•</span>
                          <span>By: {txn.encodedBy}</span>
                        </p>
                      </div>
                    </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-8 w-full lg:w-auto">
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-0.5">
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
                              className="flex-1 sm:flex-none px-4 py-2 bg-slate-500/10 text-slate-700 hover:bg-slate-500 hover:text-slate-900 border border-slate-300/30 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
                            >
                              Timeline
                            </button>
                          ) : (txn.encodedBy === userId && !isOwner) ? (
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
                              className="flex-1 sm:flex-none px-4 py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-slate-900 border border-amber-500/30 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
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
      </div>

      {/* BULK REJECT MODAL */}
      <AnimatePresence>
        {showBulkRejectModal && (
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
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative"
            >
              <h3 className="text-xl font-bold font-display text-slate-900 mb-2">
                Reject Multiple Transactions
              </h3>
              <p className="text-sm font-mono text-slate-500 mb-6">
                You are about to reject <span className="font-bold text-slate-700">{selectedTxns.size}</span> transaction(s). This action requires a reason.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                    Rejection Remarks (Required)
                  </label>
                  <textarea
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder="Provide a reason for rejecting these transactions..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-1 focus:ring-rose-500 focus:outline-hidden min-h-[100px]"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowBulkRejectModal(false);
                      setReviewRemarks("");
                    }}
                    className="flex-1 py-3 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold transition-all uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleBulkAction("rejected")}
                    className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-all uppercase tracking-wider shadow-sm"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REVIEW MODAL */}
      <AnimatePresence>
        {selectedTxn && (
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
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative"
            >
              <h3 className="text-xl font-bold font-display text-slate-900 mb-2">
                {selectedTxn.status === "pending" ? "Review Transaction" : "Transaction Timeline"}
              </h3>
              <div className="text-sm text-slate-600 mb-6 bg-white p-3 rounded-xl border border-slate-200 font-mono">
                <strong className="text-slate-700 block mb-1">
                  {selectedTxn.purpose}
                </strong>
                <div className="flex flex-col gap-1">
                  <div>
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
                  <div className="text-amber-500/90">
                    Entity: {allCompanies.find((c) => c.id === selectedTxn.companyId)?.name || selectedTxn.companyId}
                  </div>
                  <div className="text-sky-400/90 truncate">
                    Wallet: {allAccounts.find((a) => a.id === selectedTxn.cashAccountId)?.bankName} - {allAccounts.find((a) => a.id === selectedTxn.cashAccountId)?.accountName || selectedTxn.cashAccountId}
                  </div>
                </div>
              </div>

              {/* ATTACHMENT VIEWER */}
              {selectedTxn.receiptPath && (
                <AttachmentViewer transaction={selectedTxn} userId={userId} />
              )}

              {/* TIMELINE */}
              <div className="mb-6 bg-white border border-slate-200 p-4 rounded-xl">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4 font-mono">
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
                            <span className="text-sm font-bold text-slate-900 tracking-tight">{item.title}</span>
                            {item.date && (
                              <span className="text-[10px] font-mono text-slate-500 shrink-0">{item.date}</span>
                            )}
                         </div>
                         <p className="text-sm text-slate-600 mt-0.5 leading-snug break-words">
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
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-widest block font-mono">
                      Review Remarks & Comments (Required for Reject)
                    </label>
                    <textarea
                      rows={3}
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                      placeholder="e.g., Authorized per budget or Missing valid invoice..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 text-sm text-slate-900 focus:outline-hidden focus:border-amber-500 rounded-xl resize-none font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                {selectedTxn.status === "pending" ? (
                  <>
                    <button
                      onClick={() => setSelectedTxn(null)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold tracking-wider text-xs uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAction("rejected")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-450 hover:bg-rose-500 border border-rose-500/30 hover:text-slate-900 font-bold tracking-wider text-xs uppercase transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleAction("approved")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 border border-emerald-500/30 hover:text-slate-900 font-bold tracking-wider text-xs uppercase transition cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSelectedTxn(null)}
                    className="px-4 py-2 rounded-xl bg-slate-50 text-slate-700 hover:text-slate-900 font-bold tracking-wider text-xs uppercase cursor-pointer hover:bg-slate-100 transition"
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RECEIPT VIEWER POPUP MODAL */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="bg-white border border-slate-200 p-6 max-w-lg w-full relative space-y-4 rounded-2xl shadow-xl">
            <button 
              onClick={() => setPreviewReceiptUrl(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-mono text-base font-bold text-slate-900 uppercase tracking-wider">Secure Receipt Image Preview</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Attached via Quick Encode or Document Vault.</p>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[350px] flex items-center justify-center bg-slate-50 relative p-4">
              <img 
                src={previewReceiptUrl} 
                alt="Payment voucher attachment" 
                className="max-h-[350px] object-contain max-w-full rounded"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold font-mono tracking-widest transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
