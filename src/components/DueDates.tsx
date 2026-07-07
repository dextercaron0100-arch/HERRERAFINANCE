import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Info,
  Coins,
  Users,
  FileText,
  Filter,
  Trash2,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  getPayables,
  getReceivables,
  getPayrollRuns,
  getCompanies,
  markPayableAsPaid,
  markReceivableAsCollected,
  canWriteFinance,
  writeAuditLog,
  getCustomDeadlines,
  saveCustomDeadline,
  deleteCustomDeadline,
  useDBUpdate,
} from "../data/mockDatabase";
import { CustomDeadline } from "../types";
import { toast } from "sonner";

interface DueDatesProps {
  userId: string;
  companyId: string;
  onAuditLogged: () => void;
}

const addPeriod = (dateStr: string, recurrence: "monthly" | "yearly"): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d);
  if (recurrence === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

export default function DueDates({ userId, companyId, onAuditLogged }: DueDatesProps) {
  const dbTick = useDBUpdate();
  const companies = getCompanies();
  const rawPayables = getPayables(userId, companyId);
  const rawReceivables = getReceivables(userId, companyId);
  const rawPayrollRuns = getPayrollRuns(userId, companyId);

  const isAdmin = canWriteFinance(userId, companyId);

  // Custom Deadlines - shared/synced storage (Firestore-backed), scoped by company access
  const customDeadlines = useMemo(
    () => getCustomDeadlines(userId, companyId),
    [userId, companyId, dbTick]
  );

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formType, setFormType] = useState<"tax" | "utilities" | "compliance" | "other">("compliance");
  const [formAmount, setFormAmount] = useState("");
  const [formCompany, setFormCompany] = useState(companyId === "all" ? "c-bls" : companyId);
  const [formRecurrence, setFormRecurrence] = useState<"once" | "monthly" | "yearly">("once");
  const [formNotifyDays, setFormNotifyDays] = useState("2");

  // Filters
  const [filterType, setFilterType] = useState<"all" | "payable" | "receivable" | "payroll" | "compliance">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed" | "overdue">("all");

  // Calendar view state
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // Aggregate all deadlines
  const allDeadlines = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      dueDate: string;
      amount?: number;
      type: "payable" | "receivable" | "payroll" | "compliance";
      subType?: string;
      status: "pending" | "completed" | "overdue";
      companyId: string;
      originalItem: any;
    }> = [];

    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Add Payables
    rawPayables.forEach((p) => {
      let status: "pending" | "completed" | "overdue" = "pending";
      if (p.status === "paid") {
        status = "completed";
      } else if (p.dueDate < todayStr) {
        status = "overdue";
      }

      items.push({
        id: `ap-${p.id}`,
        title: `AP: ${p.payee}`,
        description: p.description,
        dueDate: p.dueDate,
        amount: p.amount,
        type: "payable",
        status,
        companyId: p.companyId,
        originalItem: p,
      });
    });

    // 2. Add Receivables
    rawReceivables.forEach((r) => {
      let status: "pending" | "completed" | "overdue" = "pending";
      if (r.status === "collected") {
        status = "completed";
      } else if (r.dueDate < todayStr) {
        status = "overdue";
      }

      items.push({
        id: `ar-${r.id}`,
        title: `AR: ${r.payer}`,
        description: r.description,
        dueDate: r.dueDate,
        amount: r.amount,
        type: "receivable",
        status,
        companyId: r.companyId,
        originalItem: r,
      });
    });

    // 3. Add Payrolls
    rawPayrollRuns.forEach((p) => {
      let status: "pending" | "completed" | "overdue" = "pending";
      if (p.status === "processed") {
        status = "completed";
      } else if (p.periodEnd < todayStr) {
        status = "overdue";
      }

      items.push({
        id: `pr-${p.id}`,
        title: `Payroll Release Period`,
        description: `Salary processing cycle ending ${p.periodEnd}`,
        dueDate: p.periodEnd,
        type: "payroll",
        status,
        companyId: p.companyId,
        originalItem: p,
      });
    });

    // 4. Add Custom Compliance Deadlines
    customDeadlines.forEach((cd) => {
      let status = cd.status as "pending" | "completed" | "overdue";
      if (cd.status !== "completed" && cd.dueDate < todayStr) {
        status = "overdue";
      }

      items.push({
        id: cd.id,
        title: cd.title,
        description: cd.description,
        dueDate: cd.dueDate,
        amount: cd.amount,
        type: "compliance",
        subType: cd.type,
        status,
        companyId: cd.companyId,
        originalItem: cd,
      });
    });

    // Sort by Due Date ascending
    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [rawPayables, rawReceivables, rawPayrollRuns, customDeadlines]);

  // Filtered Deadlines
  const filteredDeadlines = useMemo(() => {
    return allDeadlines.filter((item) => {
      const matchesType = filterType === "all" || item.type === filterType;
      
      let matchesStatus = true;
      if (filterStatus !== "all") {
        matchesStatus = item.status === filterStatus;
      }

      return matchesType && matchesStatus;
    });
  }, [allDeadlines, filterType, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    let overdueCount = 0;
    let dueTodayCount = 0;
    let dueThisWeekCount = 0;
    let totalPendingCount = 0;

    const todayDate = new Date();
    const endOfWeekDate = new Date();
    endOfWeekDate.setDate(todayDate.getDate() + 7);
    const endOfWeekStr = endOfWeekDate.toISOString().split("T")[0];

    allDeadlines.forEach((item) => {
      if (item.status !== "completed") {
        totalPendingCount++;
        if (item.dueDate < todayStr) {
          overdueCount++;
        } else if (item.dueDate === todayStr) {
          dueTodayCount++;
        } else if (item.dueDate > todayStr && item.dueDate <= endOfWeekStr) {
          dueThisWeekCount++;
        }
      }
    });

    return { overdueCount, dueTodayCount, dueThisWeekCount, totalPendingCount };
  }, [allDeadlines]);

  // Action: Add custom compliance
  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDueDate) {
      toast.error("Please provide both a Title and a Due Date.");
      return;
    }

    const newId = `c-dl-${Date.now()}`;
    const newItem: CustomDeadline = {
      id: newId,
      companyId: formCompany,
      title: formTitle.trim(),
      description: formDesc.trim(),
      dueDate: formDueDate,
      type: formType,
      amount: formAmount ? parseFloat(formAmount) : undefined,
      status: "pending",
      recurrence: formRecurrence,
      notifyDaysBefore: formNotifyDays ? parseInt(formNotifyDays, 10) : 2,
    };

    saveCustomDeadline(newItem, newId);

    // Log Audit Trail
    writeAuditLog(
      userId,
      newItem.companyId,
      `Created Custom Compliance Due Date: ${newItem.title}`,
      "compliance",
      newItem.id,
      { dueDate: newItem.dueDate }
    );

    toast.success("Compliance due date added successfully.");
    setShowAddForm(false);
    setFormTitle("");
    setFormDesc("");
    setFormDueDate("");
    setFormAmount("");
    setFormRecurrence("once");
    setFormNotifyDays("2");
    onAuditLogged();
  };

  // Action: Toggle completed
  const handleToggleComplete = (item: any) => {
    if (!isAdmin) {
      toast.error("Security enforcement: You do not have permission to manage compliance processes.");
      return;
    }

    if (item.type === "compliance") {
      const cd: CustomDeadline = item.originalItem;
      const isClosing = cd.status !== "completed";

      if (isClosing && (cd.recurrence === "monthly" || cd.recurrence === "yearly")) {
        const nextDueDate = addPeriod(cd.dueDate, cd.recurrence);
        saveCustomDeadline({ ...cd, dueDate: nextDueDate, status: "pending" }, cd.id);
        writeAuditLog(
          userId,
          cd.companyId,
          `Rescheduled Recurring Due Date: ${cd.title} to ${nextDueDate}`,
          "compliance",
          cd.id,
          { dueDate: nextDueDate }
        );
        toast.success(`Recurring deadline rescheduled to ${nextDueDate}.`);
      } else {
        const newStatus = isClosing ? "completed" : "pending";
        saveCustomDeadline({ ...cd, status: newStatus }, cd.id);
        writeAuditLog(
          userId,
          cd.companyId,
          `Toggled Custom Compliance Due Date: ${cd.title}`,
          "compliance",
          cd.id,
          { status: newStatus }
        );
        toast.success("Deadline status updated.");
      }
      onAuditLogged();
    } else if (item.type === "payable") {
      if (item.status === "completed") {
        toast.info("Payable is already paid. Open the AP module to manage reversals.");
        return;
      }
      const confirm = window.confirm(`Mark payable '${item.title}' as PAID?`);
      if (confirm) {
        const { error } = markPayableAsPaid(userId, item.originalItem.id, "");
        if (error) {
          toast.error(error);
        } else {
          toast.success("Payable marked as paid.");
          onAuditLogged();
        }
      }
    } else if (item.type === "receivable") {
      if (item.status === "completed") {
        toast.info("Receivable is already collected.");
        return;
      }
      const confirm = window.confirm(`Mark receivable '${item.title}' as COLLECTED?`);
      if (confirm) {
        const { error } = markReceivableAsCollected(userId, item.originalItem.id, "");
        if (error) {
          toast.error(error);
        } else {
          toast.success("Receivable marked as collected.");
          onAuditLogged();
        }
      }
    } else {
      toast.info("Please use the specific Wages & Payroll system module to finalize and approve payroll schedules.");
    }
  };

  // Action: Delete custom item
  const handleDeleteCustom = (id: string, title: string) => {
    if (!isAdmin) {
      toast.error("Permission denied.");
      return;
    }
    const confirm = window.confirm(`Are you sure you want to delete '${title}'?`);
    if (confirm) {
      deleteCustomDeadline(id);
      writeAuditLog(
        userId,
        null,
        `Deleted Custom Compliance Due Date: ${title}`,
        "compliance",
        id,
        { title }
      );
      toast.success("Deadline deleted.");
      onAuditLogged();
    }
  };

  // PESO FORMATTER
  const formatPeso = (num?: number) => {
    if (num === undefined) return "";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Calendar Helpers
  const calendarMonthData = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const firstDayIdx = firstDay.getDay(); // 0 (Sun) to 6 (Sat)

    // Number of days in month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Previous month total days to pad start
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const daysArray: Array<{
      dayNum: number;
      isCurrentMonth: boolean;
      dateString: string;
      items: any[];
    }> = [];

    // Pad previous month days
    for (let i = firstDayIdx - 1; i >= 0; i--) {
      const dNum = prevMonthTotalDays - i;
      const mStr = String(month === 0 ? 12 : month).padStart(2, "0");
      const yStr = month === 0 ? year - 1 : year;
      const dStr = String(dNum).padStart(2, "0");
      const dateString = `${yStr}-${mStr}-${dStr}`;

      const dayItems = allDeadlines.filter((x) => x.dueDate === dateString);

      daysArray.push({
        dayNum: dNum,
        isCurrentMonth: false,
        dateString,
        items: dayItems,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(i).padStart(2, "0");
      const dateString = `${year}-${mStr}-${dStr}`;

      const dayItems = allDeadlines.filter((x) => x.dueDate === dateString);

      daysArray.push({
        dayNum: i,
        isCurrentMonth: true,
        dateString,
        items: dayItems,
      });
    }

    // Pad next month days to complete grid (42 cells: 6 rows of 7)
    const totalCells = 42;
    const nextMonthPadding = totalCells - daysArray.length;
    for (let i = 1; i <= nextMonthPadding; i++) {
      const mStr = String(month === 11 ? 1 : month + 2).padStart(2, "0");
      const yStr = month === 11 ? year + 1 : year;
      const dStr = String(i).padStart(2, "0");
      const dateString = `${yStr}-${mStr}-${dStr}`;

      const dayItems = allDeadlines.filter((x) => x.dueDate === dateString);

      daysArray.push({
        dayNum: i,
        isCurrentMonth: false,
        dateString,
        items: dayItems,
      });
    }

    return daysArray;
  }, [currentCalendarDate, allDeadlines]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentCalendarDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentCalendarDate(newDate);
  };

  const getDeadlineStyle = (type: string) => {
    switch (type) {
      case "payable":
        return { bg: "bg-rose-50 border-rose-200 text-rose-800", dot: "bg-rose-500" };
      case "receivable":
        return { bg: "bg-emerald-50 border-emerald-200 text-emerald-800", dot: "bg-emerald-500" };
      case "payroll":
        return { bg: "bg-indigo-50 border-indigo-200 text-indigo-800", dot: "bg-indigo-500" };
      case "compliance":
      default:
        return { bg: "bg-amber-50 border-amber-200 text-amber-800", dot: "bg-amber-500" };
    }
  };

  const currentMonthYearName = currentCalendarDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-mono uppercase">
            Due Dates & Corporate Compliance
          </h1>
          <p className="text-xs text-slate-600 font-mono mt-1">
            Consolidated timeline, accounts payable, receivables, statutory filings, and payroll milestones.
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to empty all visible custom due date details?")) {
                  customDeadlines.forEach((cd) => deleteCustomDeadline(cd.id));
                  toast.success("Due date details have been emptied.");
                  onAuditLogged();
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Empty Details</span>
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00B67A] hover:bg-[#009E6B] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Deadline</span>
            </button>
          </div>
        )}
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* OVERDUE */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-mono font-bold block">
              Overdue
            </span>
            <span className="text-lg font-bold text-rose-600 font-mono">
              {stats.overdueCount}
            </span>
          </div>
        </div>

        {/* DUE TODAY */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-mono font-bold block">
              Due Today
            </span>
            <span className="text-lg font-bold text-amber-600 font-mono">
              {stats.dueTodayCount}
            </span>
          </div>
        </div>

        {/* DUE THIS WEEK */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-mono font-bold block">
              Due In 7 Days
            </span>
            <span className="text-lg font-bold text-sky-600 font-mono">
              {stats.dueThisWeekCount}
            </span>
          </div>
        </div>

        {/* TOTAL PENDING */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-mono font-bold block">
              Active Pending
            </span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {stats.totalPendingCount}
            </span>
          </div>
        </div>
      </div>

      {/* ADD CUSTOM DEADLINE FORM */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleAddCustom}
              className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-md"
            >
              <div className="border-b border-slate-100 pb-2 mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#00B67A]" />
                  <span>Configure Custom Compliance Target</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono tracking-wider mb-1">
                    Title / Compliance Event
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. PAG-IBIG Fund contribution monthly report"
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono tracking-wider mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-xl focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono tracking-wider mb-1">
                    Filing Category
                  </label>
                  <select
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-xl focus:outline-hidden focus:border-indigo-500 font-mono"
                  >
                    <option value="compliance">Compliance Filing</option>
                    <option value="tax">Tax Schedule</option>
                    <option value="utilities">Utilities & Rent</option>
                    <option value="other">Other Obligation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono tracking-wider mb-1">
                    Estimated Cost / Amount (Optional, PHP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-xl focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono tracking-wider mb-1">
                    Company
                  </label>
                  <select
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-xl focus:outline-hidden focus:border-indigo-500 font-mono"
                  >
                    {companies.map((com) => (
                      <option key={com.id} value={com.id}>
                        {com.name}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono tracking-wider mb-1">
                    Repeat
                  </label>
                  <select
                    value={formRecurrence}
                    onChange={(e: any) => setFormRecurrence(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-xl focus:outline-hidden focus:border-indigo-500 font-mono"
                  >
                    <option value="once">One-time / Fixed Date</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono tracking-wider mb-1">
                    Remind Me (Days Before)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formNotifyDays}
                    onChange={(e) => setFormNotifyDays(e.target.value)}
                    placeholder="2"
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-xl focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#00B67A] hover:bg-[#009E6B] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Schedule Deadline
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono tracking-wider mb-1">
                  Description / Instruction Memo
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Explain filing compliance guidelines or instructions..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium font-sans"
                />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE CALENDAR GRID */}
      <div className="bg-white border border-slate-200 shadow-md rounded-2xl overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest font-mono">
                Interactive Due Date Calendar
              </h2>
              <p className="text-[10px] text-slate-600 font-mono">
                Month-by-month grid layout mapping corporate cash milestones.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider min-w-[140px] text-center">
              {currentMonthYearName}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CALENDAR ROW LABELS */}
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold text-slate-600 uppercase tracking-widest pb-2">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* CALENDAR DAYS */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarMonthData.map((cell, idx) => {
            const hasItems = cell.items.length > 0;
            const isToday = cell.dateString === new Date().toISOString().split("T")[0];

            return (
              <div
                key={idx}
                className={`min-h-[75px] sm:min-h-[100px] border rounded-xl p-1.5 flex flex-col justify-between transition-all ${
                  cell.isCurrentMonth
                    ? "bg-slate-50/10 border-slate-200 hover:bg-slate-50/40"
                    : "bg-slate-100/30 border-slate-200/50 text-slate-600 opacity-60"
                } ${isToday ? "ring-2 ring-indigo-500 bg-indigo-50/5 border-indigo-200" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      isToday
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "text-slate-700 bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                  {hasItems && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                  )}
                </div>

                {/* Calendar cell events list */}
                <div className="mt-1 space-y-1 overflow-y-auto max-h-[50px] custom-scrollbar">
                  {cell.items.slice(0, 3).map((item) => {
                    const style = getDeadlineStyle(item.type);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setFilterType(item.type);
                          toast.info(`${item.title}`, {
                            description: `Due Date: ${item.dueDate} | Status: ${item.status.toUpperCase()}`,
                          });
                        }}
                        className={`text-[8px] font-mono p-0.5 border rounded-sm flex items-center gap-1 leading-tight cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ${style.bg}`}
                        title={`${item.title} (${item.status})`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                        <span className="truncate">{item.title}</span>
                      </div>
                    );
                  })}
                  {cell.items.length > 3 && (
                    <div className="text-[7px] font-mono text-slate-600 text-center font-bold">
                      +{cell.items.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED LISTING & CONTROLS */}
      <div className="bg-white border border-slate-200 shadow-md rounded-2xl overflow-hidden">
        {/* FILTERS TOOLBAR */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono">
              Filters
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* TYPE FILTER */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
              {(["all", "payable", "receivable", "payroll", "compliance"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 text-[9px] font-bold font-mono uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    filterType === t
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {t === "all" ? "All types" : t}
                </button>
              ))}
            </div>

            {/* STATUS FILTER */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
              {(["all", "pending", "overdue", "completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 text-[9px] font-bold font-mono uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    filterStatus === s
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* DETAILED DUE DATE ROWS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-medium uppercase tracking-[1px] font-mono border-b border-slate-200 select-none">
              <tr>
                <th className="p-3">Schedule Item / Event</th>
                <th className="p-3">Compliance Category</th>
                <th className="p-3">Company</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Target Due Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
              {filteredDeadlines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-600 font-mono text-xs">
                    No active due dates found matching selected filtering criteria.
                  </td>
                </tr>
              ) : (
                filteredDeadlines.map((item) => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const style = getDeadlineStyle(item.type);
                  
                  // Calculate countdown
                  const dueTime = new Date(item.dueDate).getTime();
                  const todayTime = new Date(todayStr).getTime();
                  const diffDays = Math.round((dueTime - todayTime) / (1000 * 3600 * 24));
                  
                  let countdownText = "";
                  let countdownColor = "text-slate-600";
                  
                  if (item.status === "completed") {
                    countdownText = "Completed / Disbursed";
                    countdownColor = "text-[#00B67A]";
                  } else if (diffDays === 0) {
                    countdownText = "DUE TODAY";
                    countdownColor = "text-amber-500 font-bold animate-pulse";
                  } else if (diffDays < 0) {
                    countdownText = `OVERDUE by ${Math.abs(diffDays)}d`;
                    countdownColor = "text-rose-600 font-bold";
                  } else {
                    countdownText = `Due in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
                    countdownColor = "text-indigo-600";
                  }

                  const notifyDaysBefore = item.type === "compliance"
                    ? (item.originalItem as CustomDeadline).notifyDaysBefore ?? 2
                    : 2;
                  const isReminderDue =
                    item.status !== "completed" && diffDays >= 0 && diffDays <= notifyDaysBefore;
                  const recurrence = item.type === "compliance"
                    ? (item.originalItem as CustomDeadline).recurrence
                    : undefined;

                  const com = companies.find((c) => c.id === item.companyId);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/50 transition border-l-2 ${
                        item.status === "overdue"
                          ? "border-l-rose-500 bg-rose-500/5"
                          : item.status === "completed"
                          ? "border-l-emerald-500"
                          : "border-l-transparent"
                      }`}
                    >
                      {/* Title & Description */}
                      <td className="p-3 max-w-sm">
                        <div className="font-bold text-slate-900 leading-tight">{item.title}</div>
                        {item.description && (
                          <div className="text-[10px] text-slate-600 font-mono mt-0.5 line-clamp-2">
                            {item.description}
                          </div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${style.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          <span>{item.type}</span>
                        </span>
                      </td>

                      {/* Company */}
                      <td className="p-3 text-slate-900 font-mono uppercase text-[10px]">
                        {com ? com.code : "Consolidated"}
                      </td>

                      {/* Amount */}
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {item.amount !== undefined ? formatPeso(item.amount) : "—"}
                      </td>

                      {/* Due Date & Countdown */}
                      <td className="p-3">
                        <div className="font-mono text-slate-900 font-bold flex items-center gap-1.5">
                          {item.dueDate}
                          {recurrence && recurrence !== "once" && (
                            <span
                              className="text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200"
                              title={`Repeats ${recurrence}`}
                            >
                              {recurrence}
                            </span>
                          )}
                        </div>
                        <div className={`text-[9px] font-mono uppercase font-bold tracking-wider mt-0.5 ${countdownColor}`}>
                          {countdownText}
                        </div>
                        {isReminderDue && (
                          <div className="text-[8px] font-mono font-bold uppercase tracking-wider text-amber-600 mt-0.5 flex items-center gap-1">
                            <Info className="w-2.5 h-2.5" /> Reminder
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="p-3">
                        {item.status === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-[#00B67A]">
                            Settled
                          </span>
                        ) : item.status === "overdue" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest bg-rose-50 border border-rose-200 text-rose-600 animate-pulse">
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest bg-amber-50 border border-amber-200 text-amber-600">
                            Scheduled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status !== "completed" && (
                            <button
                              onClick={() => handleToggleComplete(item)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-lg transition cursor-pointer"
                              title="Settle or mark as complete"
                            >
                              Settle
                            </button>
                          )}
                          
                          {item.type === "compliance" && isAdmin && (
                            <button
                              onClick={() => handleDeleteCustom(item.id, item.title)}
                              className="p-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-200"
                              title="Delete scheduled event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
