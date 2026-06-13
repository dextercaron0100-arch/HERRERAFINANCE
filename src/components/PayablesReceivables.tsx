/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  DollarSign,
  Plus,
  ArrowRightLeft,
  Calendar,
  AlertTriangle,
  FolderMinus,
  FolderPlus,
  CheckCircle2,
  Lock,
  Clock,
  EyeOff,
  XCircle
} from 'lucide-react';
import {
  getPayables,
  getReceivables,
  insertPayable,
  insertReceivable,
  markPayableAsPaid,
  markReceivableAsCollected,
  canWriteFinance,
  getCategories
} from '../data/mockDatabase';
import { toast } from 'sonner';

interface PayablesReceivablesProps {
  userId: string;
  companyId: string;
  onAuditLogged: () => void;
}

export default function PayablesReceivables({ userId, companyId, onAuditLogged }: PayablesReceivablesProps) {
  // Tabs
  const [activeSegment, setActiveSegment] = useState<'ap' | 'ar'>('ap');
  
  // Modal Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [apPayee, setApPayee] = useState('');
  const [apDesc, setApDesc] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apDueDate, setApDueDate] = useState('');
  
  // AR form states
  const [arPayer, setArPayer] = useState('');
  const [arDesc, setArDesc] = useState('');
  const [arAmount, setArAmount] = useState('');
  const [arDueDate, setArDueDate] = useState('');

  // Local errors
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const payables = getPayables(userId, companyId);
  const receivables = getReceivables(userId, companyId);
  const categories = getCategories(companyId);

  // PESO FORMATTER
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(num);
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Submit AP invoice
  const handleAddAP = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const amt = parseFloat(apAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Liability pricing error: capital must be strictly positive.');
      return;
    }
    if (!apPayee.trim() || !apDesc.trim() || !apDueDate) {
      setFormError('All fields represent strictly mandatory auditing values.');
      return;
    }

    const { error, payable } = insertPayable(userId, {
      companyId,
      payee: apPayee,
      description: apDesc,
      amount: amt,
      dueDate: apDueDate
    });

    if (error) {
      setFormError(error);
    } else {
      setFormSuccess('Accounts payable logged successfully!');
      setApPayee('');
      setApDesc('');
      setApAmount('');
      setApDueDate('');
      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess('');
      }, 1500);
      onAuditLogged();
    }
  };

  // Submit AR invoice
  const handleAddAR = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const amt = parseFloat(arAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Asset claim pricing error: capital must be strictly positive.');
      return;
    }
    if (!arPayer.trim() || !arDesc.trim() || !arDueDate) {
      setFormError('All fields represent strictly mandatory auditing values.');
      return;
    }

    const { error, receivable } = insertReceivable(userId, {
      companyId,
      payer: arPayer,
      description: arDesc,
      amount: amt,
      dueDate: arDueDate
    });

    if (error) {
      setFormError(error);
    } else {
      setFormSuccess('Accounts receivable logged successfully!');
      setArPayer('');
      setArDesc('');
      setArAmount('');
      setArDueDate('');
      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess('');
      }, 1500);
      onAuditLogged();
    }
  };

  // Mark Payable Paid Event (Triggers Pending cash_out)
  const handleMarkPaid = (apId: string) => {
    const defaultOutCategoryId = categories.find(c => c.name === 'operations' && c.type === 'cash_out')?.id || categories.filter(c => c.type === 'cash_out')[0]?.id;
    
    if (!defaultOutCategoryId) {
      toast.error('Operations category missing', { description: 'Internal error: operations category could not be resolved.' });
      return;
    }

    const { error, payable, txn } = markPayableAsPaid(userId, apId, defaultOutCategoryId);
    if (error) {
      toast.error('Payment Failed', { description: error });
    } else {
      toast.success('Bill marked paid', { description: `Generated pending cash outbound transaction #${txn?.id} awaiting reviews approval.` });
      onAuditLogged();
    }
  };

  // Mark Receivable Collected Event (Triggers Pending cash_in)
  const handleMarkCollected = (arId: string) => {
    const defaultInCategoryId = categories.find(c => c.name === 'collections' && c.type === 'cash_in')?.id || categories.filter(c => c.type === 'cash_in')[0]?.id;
    
    if (!defaultInCategoryId) {
      toast.error('Collections category missing', { description: 'Internal error: collections category could not be resolved.' });
      return;
    }

    const { error, receivable, txn } = markReceivableAsCollected(userId, arId, defaultInCategoryId);
    if (error) {
      toast.error('Collection Registration Failed', { description: error });
    } else {
      toast.success('Claims mark collected', { description: `Generated pending cash inflows entry #${txn?.id} awaiting reviews approval.` });
      onAuditLogged();
    }
  };

  return (
    <div className="space-y-6">
      {/* SEGMENT HEADERS NAVIGATION */}
      <div className="bg-[#181A1C] border border-[#24272C] p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl">
        <div className="flex gap-1.5 p-0.5 bg-[#141618] border border-[#24272C] rounded-2xl select-none">
          <button 
            onClick={() => {
              setActiveSegment('ap');
              setShowAddForm(false);
            }}
            className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-2xl cursor-pointer transition flex items-center gap-1.5 ${activeSegment === 'ap' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
          >
            <FolderMinus className="w-4 h-4 text-zinc-550" />
            <span>Accounts Payable (AP)</span>
          </button>
          <button 
            onClick={() => {
              setActiveSegment('ar');
              setShowAddForm(false);
            }}
            className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-2xl cursor-pointer transition flex items-center gap-1.5 ${activeSegment === 'ar' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
          >
            <FolderPlus className="w-4 h-4 text-zinc-550" />
            <span>Accounts Receivable (AR)</span>
          </button>
        </div>

        {canWriteFinance(userId, companyId) && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#24272C] hover:border-zinc-500 text-zinc-350 hover:text-white bg-[#141618] hover:bg-zinc-900 text-[10px] font-mono font-bold uppercase tracking-wider rounded-2xl cursor-pointer shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-450" />
            <span>Register New {activeSegment === 'ap' ? 'Liability bill' : 'Asset claim'}</span>
          </button>
        )}
      </div>

      {/* RENDER ADD POPUP ACCORDION */}
      {showAddForm && (
        <div className="bg-[#181A1C] border border-[#24272C] p-6 shadow-md animate-fadeIn space-y-4 rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#24272C] pb-2.5">
            <div>
              <h3 className="font-display text-base text-white tracking-tight">
                Log New Outstanding {activeSegment === 'ap' ? 'Accounts Payable liability' : 'Accounts Receivable asset'}
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mt-0.5 font-semibold">Values are tracked into monthly cash forecasts.</p>
            </div>
            <button 
              onClick={() => setShowAddForm(false)}
              className="p-1 text-zinc-400 hover:bg-zinc-805 rounded-2xl cursor-pointer hover:text-white"
            >
              <XCircle className="w-4.5 h-4.5" />
            </button>
          </div>

          {activeSegment === 'ap' ? (
            <form onSubmit={handleAddAP} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Creditor / Payee Company</span>
                <input 
                  type="text" 
                  value={apPayee}
                  onChange={(e) => setApPayee(e.target.value)}
                  placeholder="e.g., Prime Logistics Group"
                  required
                  className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono placeholder:text-zinc-650"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Invoice Description</span>
                <input 
                  type="text" 
                  value={apDesc}
                  onChange={(e) => setApDesc(e.target.value)}
                  placeholder="e.g., Branch bulk raw materials warehousing invoice"
                  required
                  className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono placeholder:text-zinc-650"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Settlement PHP Amount</span>
                <input 
                  type="number" 
                  value={apAmount}
                  onChange={(e) => setApAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  required
                  className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono placeholder:text-zinc-650"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Due Date Limits</span>
                <input 
                  type="date" 
                  value={apDueDate}
                  onChange={(e) => setApDueDate(e.target.value)}
                  required
                  className="w-full text-xs p-2 px-3 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono placeholder:text-zinc-650"
                />
              </div>
              <div className="md:col-span-4 flex justify-end gap-2 pt-3 border-t border-[#24272C]/50">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-[#24272C] rounded-2xl text-xs font-mono uppercase tracking-wider text-zinc-400 hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Write Liability entry
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddAR} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Client / Debtor Company</span>
                <input 
                  type="text" 
                  value={arPayer}
                  onChange={(e) => setArPayer(e.target.value)}
                  placeholder="e.g., Robinson Mall Franchise branch"
                  required
                  className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono placeholder:text-zinc-650"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Invoice Description</span>
                <input 
                  type="text" 
                  value={arDesc}
                  onChange={(e) => setArDesc(e.target.value)}
                  placeholder="e.g., Materials distribution rent consignment percentage"
                  required
                  className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono placeholder:text-zinc-650"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Collection PHP Amount</span>
                <input 
                  type="number" 
                  value={arAmount}
                  onChange={(e) => setArAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  required
                  className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono placeholder:text-zinc-650"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Limits claims due Date</span>
                <input 
                  type="date" 
                  value={arDueDate}
                  onChange={(e) => setArDueDate(e.target.value)}
                  required
                  className="w-full text-xs p-2 px-3 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono placeholder:text-zinc-650"
                />
              </div>
              <div className="md:col-span-4 flex justify-end gap-2 pt-3 border-t border-[#24272C]/50">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-[#24272C] rounded-2xl text-xs font-mono uppercase tracking-wider text-zinc-400 hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Write Claims Asset
                </button>
              </div>
            </form>
          )}

          {formError && (
            <p className="p-3 bg-rose-955/20 border border-rose-900 text-rose-455 text-xs font-mono font-semibold rounded-2xl">
              {formError}
            </p>
          )}
          {formSuccess && (
            <p className="p-3 bg-emerald-955/25 border border-emerald-950 text-emerald-450 text-xs font-bold rounded-2xl animate-pulse">
              {formSuccess}
            </p>
          )}
        </div>
      )}

      {/* CORE TABLES SQUEEZED */}
      <div className="bg-[#181A1C] border border-[#24272C] shadow-md rounded-2xl overflow-hidden animate-fadeIn">
        {activeSegment === 'ap' ? (
          <div>
            <div className="p-4 border-b border-[#24272C] flex items-center justify-between bg-[#141618]">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <FolderMinus className="w-4 h-4 text-zinc-450" />
                <span>Liability invoices (AP Queue)</span>
              </span>
              <span className="text-[10px] text-[#FF4C4C] font-mono font-bold uppercase tracking-wider">Creditors Balance Outstanding</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#181A1C]/50 text-zinc-400 font-medium uppercase tracking-[1px] font-mono border-b border-[#24272C]">
                  <tr>
                    <th className="p-3 border-b border-[#24272C]">Creditor Payee</th>
                    <th className="p-3 border-b border-[#24272C]">Particular Details</th>
                    <th className="p-3 border-b border-[#24272C] text-right">Outstanding value</th>
                    <th className="p-3 border-b border-[#24272C]">Limit Due Date</th>
                    <th className="p-3 border-b border-[#24272C]">Payment status</th>
                    <th className="p-3 border-b border-[#24272C] text-center">Reference txn</th>
                    <th className="p-3 border-b border-[#24272C] text-right">Action process</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#24272C] font-medium text-zinc-300">
                  {payables.length > 0 ? (
                    payables.map((p) => {
                      const isOverdue = p.status === 'unpaid' && p.dueDate < todayStr;
                      return (
                        <tr key={p.id} className="hover:bg-zinc-800/20 transition">
                          <td className="p-3 whitespace-nowrap text-white font-display text-sm font-semibold">{p.payee}</td>
                          <td className="p-3 max-w-xs truncate text-[11px] text-zinc-450" title={p.description}>
                            {p.description}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-white text-sm whitespace-nowrap">
                            {formatPeso(p.amount)}
                          </td>
                          <td className="p-3 font-mono whitespace-nowrap">
                            <span className={isOverdue ? 'text-rose-400 font-bold flex items-center gap-1' : 'text-zinc-350'}>
                              {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />}
                              <span>{p.dueDate}</span>
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {p.status === 'paid' ? (
                              <span className="px-2 py-0.5 bg-emerald-955/25 text-emerald-400 border border-emerald-900/50 text-[9px] font-mono font-bold rounded-2xl uppercase tracking-wider">
                                SETTLED PAID
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 text-[9px] rounded-2xl font-mono font-bold border uppercase tracking-wider ${isOverdue ? 'bg-rose-955/25 border-rose-900 text-rose-450 font-bold' : 'bg-amber-955/20 border-amber-900/55 text-amber-300'}`}>
                                {isOverdue ? 'AGED OVERDUE' : 'UNPAID'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-[10px] text-zinc-550 whitespace-nowrap">
                            {p.paidTransactionId ? `#${p.paidTransactionId}` : '-'}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            {p.status === 'unpaid' && canWriteFinance(userId, companyId) ? (
                              <button 
                                onClick={() => handleMarkPaid(p.id)}
                                className="px-3 py-1.5 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-[9px] font-bold uppercase tracking-wider cursor-pointer transition"
                              >
                                Trigger Payment
                              </button>
                            ) : p.status === 'paid' ? (
                              <span className="text-zinc-450 text-[10px] font-mono flex items-center justify-end gap-1 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Completed</span>
                              </span>
                            ) : (
                              <span className="text-zinc-600 font-mono text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-550 font-mono uppercase tracking-wider">
                        No outstanding accounts payables documented for this company.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="p-4 border-b border-[#24272C] flex items-center justify-between bg-[#141618]">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-zinc-450" />
                <span>Claims and Receivables (AR Queue)</span>
              </span>
              <span className="text-[10px] text-emerald-450 font-mono font-bold uppercase tracking-wider">Inflow Asset Pipeline</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#181A1C]/50 text-zinc-400 font-medium uppercase tracking-[1px] font-mono border-b border-[#24272C]">
                  <tr>
                    <th className="p-3 border-b border-[#24272C]">Debtor Payer</th>
                    <th className="p-3 border-b border-[#24272C]">Billing details</th>
                    <th className="p-3 border-b border-[#24272C] text-right">Invoice value</th>
                    <th className="p-3 border-b border-[#24272C]">Limit Due Date</th>
                    <th className="p-3 border-b border-[#24272C]">Collection status</th>
                    <th className="p-3 border-b border-[#24272C] text-center">Reference txn</th>
                    <th className="p-3 border-b border-[#24272C] text-right">Action process</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#24272C] font-medium text-zinc-300">
                  {receivables.length > 0 ? (
                    receivables.map((r) => {
                      const isOverdue = r.status === 'uncollected' && r.dueDate < todayStr;
                      return (
                        <tr key={r.id} className="hover:bg-zinc-800/20 transition">
                          <td className="p-3 whitespace-nowrap text-white font-display text-sm font-semibold">{r.payer}</td>
                          <td className="p-3 max-w-xs truncate text-[11px] text-zinc-450" title={r.description}>
                            {r.description}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-white text-sm whitespace-nowrap">
                            {formatPeso(r.amount)}
                          </td>
                          <td className="p-3 font-mono whitespace-nowrap text-zinc-350">
                            <span className={isOverdue ? 'text-amber-400 font-bold flex items-center gap-1' : 'text-zinc-350'}>
                              {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
                              <span>{r.dueDate}</span>
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {r.status === 'collected' ? (
                              <span className="px-2 py-0.5 bg-emerald-955/25 text-emerald-400 border border-emerald-900/50 text-[9px] font-mono font-bold rounded-2xl uppercase tracking-wider">
                                COMPLETED
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 text-[9px] rounded-2xl font-mono font-bold border uppercase tracking-wider ${isOverdue ? 'bg-rose-955/22 border-rose-900 text-rose-455 font-bold' : 'bg-indigo-955/20 border border-indigo-900/60 text-indigo-400'}`}>
                                {isOverdue ? 'OVERDUE AGING' : 'OPEN UNCOLLECTED'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-[10px] text-zinc-550 whitespace-nowrap">
                            {r.collectedTransactionId ? `#${r.collectedTransactionId}` : '-'}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            {r.status === 'uncollected' && canWriteFinance(userId, companyId) ? (
                              <button 
                                onClick={() => handleMarkCollected(r.id)}
                                className="px-3 py-1.5 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-[9px] font-bold uppercase tracking-wider cursor-pointer transition"
                              >
                                Collect Funds
                              </button>
                            ) : r.status === 'collected' ? (
                              <span className="text-zinc-450 text-[10px] font-mono flex items-center justify-end gap-1 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Completed</span>
                              </span>
                            ) : (
                              <span className="text-zinc-600 font-mono text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-550 font-mono uppercase tracking-wider">
                        No outstanding accounts receivables documented for this company.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
