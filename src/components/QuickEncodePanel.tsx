import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2,
  Calendar,
  DollarSign,
  FileText,
  User,
  Image as ImageIcon,
  Save,
  PlusCircle,
  Copy,
  AlertTriangle,
  X,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { 
  getCompanies, 
  getCategories, 
  getCashAccounts, 
  insertTransaction,
  getTransactions
} from '../data/mockDatabase';
import { toast } from 'sonner';
import { Transaction } from '../types';

export default function QuickEncodePanel({ 
  userId, 
  companyId, 
  isConsolidated,
  onClose
}: { 
  userId: string, 
  companyId: string, 
  isConsolidated: boolean,
  onClose?: () => void
}) {
  const companies = getCompanies();
  const today = new Date().toISOString().split("T")[0];

  const [formCompanyId, setFormCompanyId] = useState(isConsolidated ? companies[0]?.id : companyId);
  const [txnDate, setTxnDate] = useState(today);
  const [type, setType] = useState<"cash_in" | "cash_out">("cash_out");
  const [amount, setAmount] = useState<number | "">("");
  const [purpose, setPurpose] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [cashAccountId, setCashAccountId] = useState("");
  const [receiptPath, setReceiptPath] = useState<string | null>(null);

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const categories = useMemo(() => getCategories(formCompanyId).filter(c => c.type === type), [formCompanyId, type]);
  const cashAccounts = useMemo(() => getCashAccounts(formCompanyId), [formCompanyId]);
  const recentTransactions = useMemo(() => getTransactions(userId, formCompanyId), [userId, formCompanyId]);

  // AI Category Suggestion (Mock)
  useEffect(() => {
    if (purpose.length > 5 && !categoryId) {
      const lowerPurpose = purpose.toLowerCase();
      if (lowerPurpose.includes("meal") || lowerPurpose.includes("food")) {
        const cat = categories.find(c => c.name.toLowerCase().includes("meal") || c.name.toLowerCase().includes("food"));
        if (cat) setCategoryId(cat.id);
      } else if (lowerPurpose.includes("supplies") || lowerPurpose.includes("office")) {
        const cat = categories.find(c => c.name.toLowerCase().includes("office") || c.name.toLowerCase().includes("supplies"));
        if (cat) setCategoryId(cat.id);
      } else if (lowerPurpose.includes("travel") || lowerPurpose.includes("fare") || lowerPurpose.includes("gas")) {
        const cat = categories.find(c => c.name.toLowerCase().includes("travel") || c.name.toLowerCase().includes("transpo"));
        if (cat) setCategoryId(cat.id);
      }
    }
  }, [purpose, categoryId, categories]);

  // Duplicate Detector
  useEffect(() => {
    if (amount !== "" && Number(amount) > 0) {
      const numAmt = Number(amount);
      const isDupAmountDateCompany = recentTransactions.find(t => t.amount === numAmt && t.txnDate === txnDate && t.companyId === formCompanyId && t.type === type);
      const isDupAmountPurpose = recentTransactions.find(t => t.amount === numAmt && t.purpose.toLowerCase() === purpose.toLowerCase() && purpose !== "" && t.type === type);
      
      // 3 days logic
      const isDupResp = recentTransactions.find(t => {
        if (t.amount !== numAmt || t.responsiblePerson.toLowerCase() !== responsiblePerson.toLowerCase() || responsiblePerson === "" || t.type !== type) return false;
        const diff = Math.abs(new Date(t.txnDate).getTime() - new Date(txnDate).getTime());
        const diffDays = Math.ceil(diff / (1000 * 3600 * 24));
        return diffDays <= 3;
      });

      if (isDupAmountDateCompany) {
        setDuplicateWarning(`Possible duplicate: Same amount (₱${numAmt}) on ${txnDate}`);
      } else if (isDupAmountPurpose) {
        setDuplicateWarning(`Possible duplicate: Same amount and purpose "${purpose}"`);
      } else if (isDupResp) {
        setDuplicateWarning(`Possible duplicate: ${responsiblePerson} requested ₱${numAmt} within 3 days`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [amount, txnDate, formCompanyId, purpose, responsiblePerson, recentTransactions, type]);


  const handleSave = (encodeAnother: boolean) => {
    if (!formCompanyId || !txnDate || !categoryId || !amount || !purpose || !responsiblePerson || !cashAccountId || !receiptPath) {
      toast.error("Please fill in all required fields, including Cash/Bank and Receipt.");
      return;
    }

    if (Number(amount) <= 0) {
      toast.error("Amount must be greater than zero.");
      return;
    }

    const payload: Omit<Transaction, "id" | "status" | "encodedBy" | "createdAt" | "updatedAt"> = {
      companyId: formCompanyId,
      cashAccountId: cashAccountId || undefined,
      txnDate,
      type,
      amount: Number(amount),
      categoryId,
      purpose,
      responsiblePerson,
      receiptPath,
      mockMetadata: null,
      paymentMethod: "",
      reversalOf: null
    };

    const res = insertTransaction(userId, payload);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Transaction encoded successfully.");
      
      // Reset fields to avoid duplication
      setAmount("");
      setPurpose("");
      setReceiptPath(null);
      setCategoryId("");
      setCashAccountId("");
      setResponsiblePerson("");
      setDuplicateWarning(null);

      if (!encodeAnother && onClose) {
        onClose();
      }
    }
  };

  const handleDuplicateLast = () => {
    const myTxns = recentTransactions.filter(t => t.type === type);
    if (myTxns.length > 0) {
      const last = myTxns[0]; // assuming sorted by newest first
      setFormCompanyId(last.companyId);
      setAmount(last.amount);
      setPurpose(last.purpose);
      setCategoryId(last.categoryId);
      setResponsiblePerson(last.responsiblePerson);
      if (last.cashAccountId) setCashAccountId(last.cashAccountId);
      toast.info("Filled with last encoded transaction.");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-full shadow-2xl overflow-hidden relative">
      <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white">
        <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
          <PlusCircle className="w-4 h-4" /> Quick Encode
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDuplicateLast}
            className="text-[10px] uppercase font-mono tracking-widest bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded flex items-center gap-1 transition"
          >
            <Copy className="w-3 h-3" /> Dup Last
          </button>
          {onClose && (
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-4">
        {duplicateWarning && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-400 font-mono">{duplicateWarning}</p>
              <button 
                className="text-[10px] mt-2 underline text-amber-500/70 hover:text-amber-400"
                onClick={() => setDuplicateWarning(null)}
              >
                Ignore Warning
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 block">Type</label>
            <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setType('cash_out')}
                className={`flex-1 text-xs font-mono py-1.5 rounded-md transition ${type === 'cash_out' ? 'bg-rose-500 text-white font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cash Out
              </button>
              <button 
                onClick={() => setType('cash_in')}
                className={`flex-1 text-xs font-mono py-1.5 rounded-md transition ${type === 'cash_in' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cash In
              </button>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</label>
            <input 
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition font-mono"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Amount</label>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition font-mono placeholder:text-zinc-700"
            />
          </div>

          {isConsolidated && (
            <div className="col-span-2">
              <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Company</label>
              <select 
                value={formCompanyId}
                onChange={(e) => setFormCompanyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition font-mono"
              >
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="col-span-2">
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Purpose / Payee</label>
            <input 
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Office Supplies"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition font-mono placeholder:text-zinc-700"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><ListTodo className="w-3 h-3" /> Category</label>
            <select 
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition font-mono"
            >
              <option value="">Select...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Cash/Bank</label>
            <select 
              value={cashAccountId}
              onChange={(e) => setCashAccountId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition font-mono"
            >
              <option value="">Select...</option>
              {cashAccounts.map(c => <option key={c.id} value={c.id}>{c.bankName} - {c.accountNumber.slice(-4)}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Responsible Person</label>
            <input 
              type="text"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition font-mono placeholder:text-zinc-700"
            />
          </div>

          <div className="col-span-2">
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Receipt Upload</label>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setReceiptPath(receiptPath ? null : "/mock-receipt.jpg");
                  if (!receiptPath) toast.success("Mock receipt attached");
                }}
                className={`flex-1 border border-dashed rounded-lg py-3 flex items-center justify-center gap-2 transition ${receiptPath ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700'}`}
              >
                {receiptPath ? <CheckCircle2 className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                <span className="text-xs font-mono uppercase tracking-widest">
                  {receiptPath ? "Attached" : "Attach File"}
                </span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Pre-Approval Checklist Badges */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2 block">Checklist</h4>
          <div className="flex flex-wrap gap-2">
            <Badge done={Number(amount) > 0} label="Amount" />
            <Badge done={!!categoryId} label="Category" />
            <Badge done={!!cashAccountId} label="Cash/Bank" />
            <Badge done={!!purpose} label="Purpose" />
            <Badge done={!!responsiblePerson} label="Person" />
            <Badge done={!!receiptPath} label="Receipt" />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 bg-white flex flex-col gap-2">
        <button 
          onClick={() => handleSave(true)}
          className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-widest transition flex justify-center items-center gap-2"
        >
          Save & Encode Another
        </button>
        <button 
          onClick={() => handleSave(false)}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-widest transition flex justify-center items-center gap-2 shadow-lg shadow-emerald-900/20"
        >
          <Save className="w-4 h-4" /> Submit for Approval
        </button>
      </div>
    </div>
  );
}

function Badge({ done, label }: { done: boolean, label: string }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono uppercase tracking-widest border transition ${done ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
      {done ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current opacity-50" />}
      {label}
    </div>
  );
}
