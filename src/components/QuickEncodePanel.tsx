import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2,
  Calendar,
  FileText,
  User,
  Image as ImageIcon,
  Save,
  PlusCircle,
  Copy,
  AlertTriangle,
  X,
  CheckCircle2,
  ListTodo,
  HelpCircle
} from 'lucide-react';
import { 
  getCompanies, 
  getCategories, 
  getCashAccounts, 
  insertTransaction,
  getTransactions
} from '../data/mockDatabase';
import { compressImage } from '../lib/imageUtils';
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
  useEffect(() => {
    setFormCompanyId(isConsolidated ? companies[0]?.id : companyId);
  }, [companyId, isConsolidated]);
  const [txnDate, setTxnDate] = useState(today);
  const [type, setType] = useState<"cash_in" | "cash_out">("cash_in");
  const [amountStr, setAmountStr] = useState<string>("");
  const amount = amountStr === "" ? "" : Number(amountStr.replace(/,/g, ''));
  const [purpose, setPurpose] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [remarks, setRemarks] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [paymentAllocations, setPaymentAllocations] = useState<{ id: string, cashAccountId: string, amountStr: string }[]>([
    { id: "initial", cashAccountId: "", amountStr: "" }
  ]);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const categories = useMemo(() => getCategories(formCompanyId).filter(c => c.type === type), [formCompanyId, type]);
  const cashAccounts = useMemo(() => getCashAccounts(formCompanyId), [formCompanyId]);
  const recentTransactions = useMemo(() => getTransactions(userId, formCompanyId), [userId, formCompanyId]);

  const formatInput = (val: string) => {
    let cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[0]) {
      parts[0] = Number(parts[0]).toLocaleString('en-US');
    }
    return parts.join('.');
  };

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
    const validAllocations = [...paymentAllocations].filter(p => p.cashAccountId);

    if (!formCompanyId || !txnDate || !categoryId || !amount || !purpose || !responsiblePerson || validAllocations.length === 0 || !receiptPath) {
      toast.error("Please fill in all required fields, including Payment Method(s) and Receipt.");
      return;
    }

    if (Number(amount) <= 0) {
      toast.error("Amount must be greater than zero.");
      return;
    }

    // Auto-fill amount if only one payment method
    if (validAllocations.length === 1 && !validAllocations[0].amountStr) {
      validAllocations[0].amountStr = amountStr;
    }

    let totalAllocated = 0;
    for (const alloc of validAllocations) {
      const allocAmt = alloc.amountStr === "" ? 0 : Number(alloc.amountStr.replace(/,/g, ''));
      if (allocAmt <= 0) {
        toast.error("Please specify a valid amount for each payment method.");
        return;
      }
      totalAllocated += allocAmt;
    }

    if (totalAllocated !== Number(amount)) {
      toast.error(`Payment methods total (₱${totalAllocated.toLocaleString()}) does not match the total amount (₱${Number(amount).toLocaleString()}).`);
      return;
    }

    let hasError = false;
    for (const alloc of validAllocations) {
      const allocAmt = alloc.amountStr === "" ? 0 : Number(alloc.amountStr.replace(/,/g, ''));
      const payload: Omit<Transaction, "id" | "status" | "encodedBy" | "createdAt" | "updatedAt"> = {
        companyId: formCompanyId,
        cashAccountId: alloc.cashAccountId,
        txnDate,
        type,
        amount: allocAmt,
        categoryId,
        purpose,
        responsiblePerson,
        remarks: remarks.trim() || null,
        receiptPath,
        tags,
        mockMetadata: null,
        paymentMethod: "",
        reversalOf: null
      };

      const res = insertTransaction(userId, payload);
      if (res.error) {
        toast.error(res.error);
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      toast.success(validAllocations.length > 1 ? "Split transactions encoded successfully." : "Transaction encoded successfully.");
      
      // Reset fields to avoid duplication
      setAmountStr("");
      setPurpose("");
      setReceiptPath(null);
      setCategoryId("");
      setPaymentAllocations([{ id: Date.now().toString(), cashAccountId: "", amountStr: "" }]);
      setResponsiblePerson("");
      setRemarks("");
      setTags([]);
      setTagsInput("");
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
      setAmountStr(formatInput(last.amount.toString()));
      setPurpose(last.purpose);
      setCategoryId(last.categoryId);
      setResponsiblePerson(last.responsiblePerson);
      if (last.cashAccountId) {
        setPaymentAllocations([{ id: Date.now().toString(), cashAccountId: last.cashAccountId, amountStr: formatInput(last.amount.toString()) }]);
      }
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
                onClick={() => setType('cash_in')}
                className={`flex-1 text-xs font-mono py-1.5 rounded-md transition ${type === 'cash_in' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cash In
              </button>
              <button 
                onClick={() => setType('cash_out')}
                className={`flex-1 text-xs font-mono py-1.5 rounded-md transition ${type === 'cash_out' ? 'bg-rose-500 text-white font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cash Out
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
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><span className="font-sans font-bold text-xs leading-none">₱</span> Amount</label>
            <input 
              type="text"
              value={amountStr}
              onChange={(e) => setAmountStr(formatInput(e.target.value))}
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

          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest flex items-center gap-1 group">
                <Building2 className="w-3 h-3" /> Payment Method(s)
                <div className="relative flex items-center">
                  <HelpCircle className="w-3 h-3 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-sans normal-case tracking-normal p-2 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center shadow-xl">
                    Total split amount is automatically validated against the total transaction amount to ensure they match exactly.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              </label>
              <button 
                onClick={() => setPaymentAllocations([...paymentAllocations, { id: Date.now().toString() + Math.random(), cashAccountId: "", amountStr: "" }])}
                className="text-[10px] uppercase font-mono tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded flex items-center gap-1 transition"
              >
                <PlusCircle className="w-3 h-3" /> Split
              </button>
            </div>
            
            <div className="space-y-2">
              {paymentAllocations.map((alloc, idx) => (
                <div key={alloc.id} className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <select 
                    value={alloc.cashAccountId}
                    onChange={(e) => {
                      const newAlloc = paymentAllocations.map((a, i) => i === idx ? { ...a, cashAccountId: e.target.value } : a);
                      setPaymentAllocations(newAlloc);
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500/50 transition font-mono"
                  >
                    <option value="">Select Account...</option>
                    {cashAccounts.map(c => <option key={c.id} value={c.id}>{c.bankName} - {c.accountNumber.slice(-4)}</option>)}
                  </select>
                  
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₱</span>
                    <input 
                      type="text"
                      value={alloc.amountStr}
                      placeholder="Amount"
                      onChange={(e) => {
                        const newAlloc = paymentAllocations.map((a, i) => i === idx ? { ...a, amountStr: formatInput(e.target.value) } : a);
                        setPaymentAllocations(newAlloc);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-md pl-6 pr-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500/50 transition font-mono"
                    />
                  </div>
                  
                  {paymentAllocations.length > 1 && (
                    <button 
                      onClick={() => setPaymentAllocations(paymentAllocations.filter((_, i) => i !== idx))}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
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
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Remarks</label>
            <input 
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition font-mono placeholder:text-zinc-700"
            />
          </div>

          <div className="col-span-2">
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Tags</label>
            <div className="flex flex-col gap-2">
              <input 
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagsInput.trim()) {
                    e.preventDefault();
                    if (!tags.includes(tagsInput.trim().toLowerCase())) {
                      setTags([...tags, tagsInput.trim().toLowerCase()]);
                    }
                    setTagsInput("");
                  }
                }}
                placeholder="Type tag and press Enter"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition font-mono placeholder:text-zinc-700"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] rounded flex items-center gap-1 uppercase font-mono font-bold tracking-widest">
                      {tag}
                      <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-emerald-950">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-2">
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Receipt Upload</label>
            <div className="flex gap-2 relative">
              <input 
                type="file" 
                id="receipt-upload"
                accept="image/*,.pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.type.startsWith('image/')) {
                      try {
                        const compressedBase64 = await compressImage(file);
                        setReceiptPath(compressedBase64);
                        toast.success("File attached");
                      } catch (err) {
                        toast.error("Failed to process image");
                      }
                    } else {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setReceiptPath(reader.result as string);
                        toast.success("File attached");
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                }}
              />
              <div 
                className={`flex-1 border border-dashed rounded-lg py-3 flex items-center justify-center gap-2 transition pointer-events-none ${receiptPath ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700'}`}
              >
                {receiptPath ? <CheckCircle2 className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                <span className="text-xs font-mono uppercase tracking-widest">
                  {receiptPath ? "Attached" : "Attach File"}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Pre-Approval Checklist Badges */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2 block">Checklist</h4>
          <div className="flex flex-wrap gap-2">
            <Badge done={Number(amount) > 0} label="Amount" />
            <Badge done={!!categoryId} label="Category" />
            <Badge done={paymentAllocations.some(p => p.cashAccountId)} label="Cash/Bank" />
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
