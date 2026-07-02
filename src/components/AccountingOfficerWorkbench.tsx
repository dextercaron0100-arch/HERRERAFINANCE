import React, { useState, useEffect } from 'react';
import QuickEncodePanel from './QuickEncodePanel';
import { getTransactions, useDBUpdate, getCategories, getCashAccounts, getCompanies, getProfiles } from '../data/mockDatabase';
import { Transaction } from '../types';
import { Clock, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle } from 'lucide-react';

export default function AccountingOfficerWorkbench({ userId, companyId, isConsolidated }: { userId: string, companyId: string, isConsolidated: boolean }) {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<{ [id: string]: string }>({});
  const [cashAccounts, setCashAccounts] = useState<{ [id: string]: string }>({});
  const [profilesMap, setProfilesMap] = useState<{ [id: string]: string }>({});
  useDBUpdate(); // force re-render on database changes

  useEffect(() => {
    // Fetch all transactions for the context
    const txns = getTransactions(userId, isConsolidated ? null : companyId);
    
    // Build category map
    let allCats: any[] = [];
    let allAccs: any[] = [];
    if (isConsolidated) {
      const comps = getCompanies();
      comps.forEach(c => {
        allCats = allCats.concat(getCategories(c.id));
        allAccs = allAccs.concat(getCashAccounts(c.id));
      });
    } else {
      allCats = getCategories(companyId);
      allAccs = getCashAccounts(companyId);
    }
    
    const catMap = Object.fromEntries(allCats.map(c => [c.id, c.name]));
    const accMap = Object.fromEntries(allAccs.map(a => [a.id, `${a.bankName} - ${a.accountName}`]));
    
    setCategories(catMap);
    setCashAccounts(accMap);

    const profs = getProfiles();
    const profMap = Object.fromEntries(profs.map(p => [p.id, p.email]));
    setProfilesMap(profMap);

    // Sort by created at descending and take top 5
    const sorted = txns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setRecentTransactions(sorted.slice(0, 5));
  }, [userId, companyId, isConsolidated]);

  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(num);
  };

  return (
    <div className="w-full h-[calc(100vh-80px)] bg-slate-50 text-slate-900 p-4 md:p-6 lg:p-8 font-sans overflow-y-auto custom-scrollbar flex justify-center">
      <div className="w-full max-w-4xl flex flex-col gap-6 pb-20 items-stretch mx-auto">
        <div className="w-full shrink-0">
          <QuickEncodePanel 
            userId={userId} 
            companyId={companyId} 
            isConsolidated={isConsolidated} 
          />
        </div>

        {/* Recent Transactions Tracker */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-inner shrink-0 flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-4 shrink-0">
            <Clock className="w-5 h-5 text-[#00B67A]" />
            <h3 className="text-base font-semibold text-slate-900 font-mono uppercase tracking-widest">
              Recent Transactions
            </h3>
          </div>
          
          <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No recent transactions found.</p>
            ) : (
              recentTransactions.map(txn => {
                const catName = categories[txn.categoryId] || 'Operations';
                const accName = txn.cashAccountId ? cashAccounts[txn.cashAccountId] : txn.paymentMethod;
                const encodedByEmail = profilesMap[txn.encodedBy] || 'finance@sys.com';
                
                return (
                  <div key={txn.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${txn.type === 'cash_in' ? 'bg-[#00B67A]/10 text-[#00B67A]' : 'bg-rose-500/10 text-[#FB7185]'}`}>
                        {txn.type === 'cash_in' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2 mb-0.5">
                           <p className="text-sm font-semibold text-slate-900 truncate uppercase tracking-tight">{catName}</p>
                           {accName && (
                             <span className="px-1.5 py-0.5 bg-sky-950/20 text-sky-400 border border-sky-900/30 rounded text-[9px] font-mono font-medium truncate max-w-[150px] uppercase">
                               {accName}
                             </span>
                           )}
                        </div>
                        <p className="text-xs text-slate-600 font-mono flex items-center gap-2">
                          <span>{txn.txnDate}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="truncate max-w-[150px] text-[10px]" title={encodedByEmail}>{encodedByEmail}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold font-mono ${txn.type === 'cash_in' ? 'text-[#00B67A]' : 'text-[#FB7185]'}`}>
                        {txn.type === 'cash_in' ? '+' : '-'}{formatPeso(txn.amount)}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {txn.status === 'pending' && <Clock className="w-3 h-3 text-amber-500" />}
                        {txn.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-[#00B67A]" />}
                        {txn.status === 'rejected' && <XCircle className="w-3 h-3 text-rose-500" />}
                        <p className={`text-[10px] uppercase font-bold tracking-wide ${
                          txn.status === 'pending' ? 'text-amber-600' :
                          txn.status === 'approved' ? 'text-[#00B67A]' :
                          txn.status === 'rejected' ? 'text-rose-600' :
                          'text-slate-500'
                        }`}>
                          {txn.status}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
