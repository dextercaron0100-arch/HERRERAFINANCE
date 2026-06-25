import React, { useState, useMemo, useRef } from 'react';
import { 
  CheckSquare, 
  UploadCloud, 
  FileWarning, 
  AlertCircle, 
  TrendingUp, 
  Download, 
  Plus, 
  Clock, 
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { 
  getTransactions, 
  getPayables, 
  getReceivables, 
  getCompanies,
  useDBUpdate,
  updateTransactionMetadata,
  markPayableAsPaid,
  markReceivableAsCollected,
  getCategories
} from '../data/mockDatabase';
import { 
  getAccountingTaskBoard, 
  getTodayAccountingSummary,
  getDailyClosingChecklist
} from '../lib/accountingOfficerMetrics';
import { toast } from "sonner";
import QuickEncodePanel from './QuickEncodePanel';
import { AnimatePresence, motion } from "motion/react";

import AIAccountingAssistant from './AIAccountingAssistant';

export default function AccountingOfficerWorkbench({ userId, companyId, isConsolidated }: { userId: string, companyId: string, isConsolidated: boolean }) {
  const dbTick = useDBUpdate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTxnIdForReceipt, setSelectedTxnIdForReceipt] = useState<string | null>(null);

  const companies = getCompanies();
  const targetCompanyIds = isConsolidated ? companies.map(c => c.id) : [companyId];

  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const { transactions, payables, receivables } = useMemo(() => {
    let txns: any[] = [];
    let pays: any[] = [];
    let recs: any[] = [];

    targetCompanyIds.forEach(cId => {
      txns = [...txns, ...getTransactions(userId, cId)];
      pays = [...pays, ...getPayables(userId, cId)];
      recs = [...recs, ...getReceivables(userId, cId)];
    });

    return { transactions: txns, payables: pays, receivables: recs };
  }, [dbTick, userId, targetCompanyIds]);

  const summary = useMemo(() => getTodayAccountingSummary(transactions, payables, receivables), [transactions, payables, receivables]);
  const tasks = useMemo(() => getAccountingTaskBoard(transactions, payables, receivables), [transactions, payables, receivables]);
  
  const [closingChecklist, setClosingChecklist] = useState(getDailyClosingChecklist());
  const [showMobileEncode, setShowMobileEncode] = useState(false);

  const toggleChecklist = (id: string) => {
    setClosingChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const getCompanyName = (cId: string) => companies.find(c => c.id === cId)?.name || 'Unknown';

  const toEncodeTasks = tasks.filter(t => t.type === 'unencoded_payable' || t.type === 'unencoded_receivable');
  const missingReceiptTasks = tasks.filter(t => t.type === 'missing_receipt');
  const overdueTasks = tasks.filter(t => t.type === 'overdue_ap' || t.type === 'overdue_ar');
  const reviewTasks = tasks.filter(t => t.type === 'pending_review');

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Type,Amount,Status\n"
      + transactions.filter(t => t.txnDate === new Date().toISOString().split("T")[0])
          .map(t => `${t.txnDate},${t.type},${t.amount},${t.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `daily_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Daily report exported successfully");
  };

  const handleTaskAction = (task: any) => {
    if (task.type === "missing_receipt") {
      const txnId = task.id.replace("task-receipt-", "");
      setSelectedTxnIdForReceipt(txnId);
      fileInputRef.current?.click();
    } else if (task.type === "overdue_ap") {
      const payableId = task.id.replace("task-ap-", "");
      const cats = getCategories(task.companyId);
      const cat = cats.find(c => c.type === "cash_out")?.id || "";
      const res = markPayableAsPaid(userId, payableId, cat);
      if (res.error) toast.error(res.error);
      else toast.success("Payable marked as paid!");
    } else if (task.type === "overdue_ar") {
      const recId = task.id.replace("task-ar-", "");
      const cats = getCategories(task.companyId);
      const cat = cats.find(c => c.type === "cash_in")?.id || "";
      const res = markReceivableAsCollected(userId, recId, cat);
      if (res.error) toast.error(res.error);
      else toast.success("Receivable marked as collected!");
    } else if (task.type === "pending_review") {
      toast.info("Navigate to Approvals module to review this item.");
    } else {
      toast.info(`${task.actionLabel} coming soon.`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedTxnIdForReceipt) {
      const file = e.target.files[0];
      const mockUrl = URL.createObjectURL(file);
      const res = updateTransactionMetadata(userId, selectedTxnIdForReceipt, { scanRef: "MANUAL-ATTACH", timestamp: new Date().toISOString() }, mockUrl);
      if (res.error) {
         toast.error(res.error);
      } else {
         toast.success("Receipt attached successfully!");
      }
      setSelectedTxnIdForReceipt(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0D0D0D] text-white p-4 md:p-6 lg:p-8 font-sans">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,application/pdf" 
        onChange={handleFileUpload} 
      />
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 font-mono uppercase tracking-tight">
            <CheckSquare className="w-6 h-6 text-emerald-400" />
            Accounting Workbench
          </h1>
          <p className="text-zinc-400 text-sm mt-1.5 font-mono uppercase tracking-widest">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#181A1C] border border-[#24272C] hover:border-zinc-500 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-widest transition"
          >
            <Download className="w-4 h-4" /> Export Daily Report
          </button>
          <button 
            onClick={() => setShowMobileEncode(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-widest transition lg:hidden"
          >
            <Plus className="w-4 h-4" /> Quick Encode
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition" />
          <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" /> Today Encoded
          </h3>
          <div className="text-2xl font-bold font-mono">{summary.totalEncoded}</div>
        </div>

        <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition" />
          <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 mb-2">
            <FileWarning className="w-4 h-4 text-amber-400" /> Missing Receipts
          </h3>
          <div className="text-2xl font-bold font-mono text-amber-400">{summary.missingReceipts}</div>
        </div>

        <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition" />
          <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-rose-400" /> Overdue AP
          </h3>
          <div className="text-2xl font-bold font-mono text-rose-400">{summary.overduePayables}</div>
        </div>

        <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Uncollected AR
          </h3>
          <div className="text-2xl font-bold font-mono text-emerald-400">{summary.uncollectedReceivables}</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="hidden lg:block w-[340px] shrink-0 h-[864px]">
          <QuickEncodePanel 
            userId={userId} 
            companyId={companyId} 
            isConsolidated={isConsolidated} 
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-emerald-400" /> Daily Task Board
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TaskColumn title="To Encode" tasks={toEncodeTasks} getCompanyName={getCompanyName} formatPeso={formatPeso} emptyMsg="All done!" onAction={handleTaskAction} />
            <TaskColumn title="Missing Receipts" tasks={missingReceiptTasks} getCompanyName={getCompanyName} formatPeso={formatPeso} emptyMsg="All receipts attached!" onAction={handleTaskAction} />
            <TaskColumn title="Overdue / Due Today" tasks={overdueTasks} getCompanyName={getCompanyName} formatPeso={formatPeso} emptyMsg="No overdue items!" onAction={handleTaskAction} />
            <TaskColumn title="For Review" tasks={reviewTasks} getCompanyName={getCompanyName} formatPeso={formatPeso} emptyMsg="Inbox zero!" onAction={handleTaskAction} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-6 h-full flex flex-col">
             <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
               <TrendingUp className="w-4 h-4 text-emerald-400" /> AP / AR Aging Summary
             </h3>
             <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left text-xs font-mono text-zinc-300">
                 <thead className="text-zinc-500 border-b border-[#24272C]">
                   <tr>
                     <th className="pb-3 uppercase tracking-widest font-normal">Type</th>
                     <th className="pb-3 uppercase tracking-widest font-normal text-right">Current</th>
                     <th className="pb-3 uppercase tracking-widest font-normal text-right">1-30 Days</th>
                     <th className="pb-3 uppercase tracking-widest font-normal text-right">31-60 Days</th>
                     <th className="pb-3 uppercase tracking-widest font-normal text-right">61-90 Days</th>
                     <th className="pb-3 uppercase tracking-widest font-normal text-right">&gt; 90 Days</th>
                     <th className="pb-3 uppercase tracking-widest font-normal text-right text-white">Total</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#24272C]">
                   <tr>
                     <td className="py-4 text-amber-400 font-bold">Accounts Payable</td>
                     <td className="py-4 text-right">₱0</td>
                     <td className="py-4 text-right">{formatPeso(payables.filter(p => p.status === 'unpaid').reduce((acc, curr) => acc + curr.amount, 0))}</td>
                     <td className="py-4 text-right">₱0</td>
                     <td className="py-4 text-right">₱0</td>
                     <td className="py-4 text-right">₱0</td>
                     <td className="py-4 text-right text-white font-bold">{formatPeso(payables.filter(p => p.status === 'unpaid').reduce((acc, curr) => acc + curr.amount, 0))}</td>
                   </tr>
                   <tr>
                     <td className="py-4 text-emerald-400 font-bold">Accounts Receivable</td>
                     <td className="py-4 text-right">₱0</td>
                     <td className="py-4 text-right">{formatPeso(receivables.filter(r => r.status === 'uncollected').reduce((acc, curr) => acc + curr.amount, 0))}</td>
                     <td className="py-4 text-right">₱0</td>
                     <td className="py-4 text-right">₱0</td>
                     <td className="py-4 text-right">₱0</td>
                     <td className="py-4 text-right text-white font-bold">{formatPeso(receivables.filter(r => r.status === 'uncollected').reduce((acc, curr) => acc + curr.amount, 0))}</td>
                   </tr>
                 </tbody>
               </table>
             </div>
           </div>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-6">
            <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" /> Daily Closing Checklist
            </h3>
            <div className="space-y-3 mb-6">
              {closingChecklist.map(item => (
                <label key={item.id} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleChecklist(item.id)}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[#24272C] group-hover:border-emerald-500/50 text-transparent'}`}>
                    <CheckSquare className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-sm font-mono transition-colors ${item.done ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>{item.label}</span>
                </label>
              ))}
            </div>
            <button 
              onClick={() => {
                setClosingChecklist(prev => prev.map(item => ({ ...item, done: true })));
                toast.success("Day marked as complete!");
              }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg text-xs font-bold font-mono uppercase tracking-widest transition"
            >
              Mark Day as Complete
            </button>
          </div>
          <AIAccountingAssistant userId={userId} companyId={companyId} />
        </div>
      </div>

      <AnimatePresence>
        {showMobileEncode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4 lg:hidden"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md h-[85vh] sm:h-[800px]"
            >
              <QuickEncodePanel 
                userId={userId} 
                companyId={companyId} 
                isConsolidated={isConsolidated} 
                onClose={() => setShowMobileEncode(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskColumn({ title, tasks, getCompanyName, formatPeso, emptyMsg, onAction }: { title: string, tasks: any[], getCompanyName: (id:string)=>string, formatPeso: (v:number)=>string, emptyMsg: string, onAction?: (task: any) => void }) {
  return (
    <div className="flex flex-col bg-[#141618] border border-[#24272C] rounded-xl overflow-hidden h-[400px]">
      <div className="bg-[#181A1C] p-3 border-b border-[#24272C] flex justify-between items-center">
        <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-300">{title}</h4>
        <span className="bg-[#24272C] text-zinc-400 text-[10px] px-2 py-0.5 rounded-full font-mono">{tasks.length}</span>
      </div>
      <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-xs font-mono uppercase tracking-widest">
            {emptyMsg}
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="bg-[#181A1C] border border-[#24272C] p-3 rounded-lg group hover:border-emerald-500/30 transition">
              <div className="flex justify-between items-start mb-2">
                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest truncate pr-2">
                  {getCompanyName(task.companyId)}
                </div>
                {task.priority === 'high' && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />}
                {task.priority === 'warning' && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />}
              </div>
              <div className="font-medium text-sm text-zinc-200 leading-tight mb-1">{task.title}</div>
              {task.subtitle && <div className="text-xs text-zinc-400 mb-3 truncate">{task.subtitle}</div>}
              
              <div className="flex justify-between items-end mt-4">
                <div className="flex flex-col">
                  {task.amount !== undefined && <span className="font-mono text-sm font-bold text-white">{formatPeso(task.amount)}</span>}
                  {task.dueDate && <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {task.dueDate}</span>}
                </div>
                <button 
                  onClick={() => onAction ? onAction(task) : toast.info(`${task.actionLabel} coming in Phase 2`)}
                  className="text-[10px] font-mono uppercase tracking-widest bg-[#24272C] hover:bg-emerald-900/50 hover:text-emerald-400 text-zinc-300 px-3 py-1.5 rounded transition"
                >
                  {task.actionLabel}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
