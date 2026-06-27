/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  ShieldCheck,
  Layers,
  Monitor,
  Activity,
  Zap,
  Loader2
} from 'lucide-react';
import { getAuditLogs, getProfiles, getTransactions } from '../data/mockDatabase';
import Markdown from 'react-markdown';

interface AuditLogComponentProps {
  userId: string;
  companyId: string;
}

export default function AuditLog({ userId, companyId }: AuditLogComponentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  
  const [riskSummary, setRiskSummary] = useState<string | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);

  const logs = getAuditLogs(userId, companyId);
  const profiles = getProfiles();
  const transactions = getTransactions(userId, companyId);

  // FILTER LOGS
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const level = (l.details.level || 'info') as string;
      const detailStr = (l.details.comment || JSON.stringify(l.details)) as string;
      const ip = (l.details.ip || '127.0.0.1') as string;

      const searchStr = `${l.action} ${detailStr} ${ip} ${l.actorId}`.toLowerCase();
      if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;
      if (selectedLevel !== 'all' && level !== selectedLevel) return false;
      return true;
    });
  }, [logs, searchTerm, selectedLevel]);

  const handleGenerateRiskAssessment = async () => {
    if (transactions.length === 0) {
      setRiskSummary("No transactions available for risk assessment.");
      return;
    }

    setIsAssessing(true);
    setRiskSummary(null);

    try {
      const res = await fetch("/api/risk-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions })
      });
      const data = await res.json();
      if (data.error) {
        setRiskSummary(`Error: ${data.error}`);
      } else {
        setRiskSummary(data.summary);
      }
    } catch (e: any) {
      setRiskSummary(`Error generating risk assessment: ${e.message}`);
    } finally {
      setIsAssessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION PANEL */}
      <div className="bg-white border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl">
        <div>
          <h1 className="text-base font-display font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-slate-600 animate-pulse" />
            <span>Immutable Integrity Security Logs</span>
          </h1>
          <p className="text-[10px] text-zinc-450 font-mono uppercase tracking-wider mt-0.5 font-semibold">Strictly tracks accounting adjustments, salary modifications and reviews decisions.</p>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row gap-2 select-none w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actor email, action..."
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-hidden focus:border-white w-full sm:w-64 font-mono placeholder:text-zinc-600"
            />
          </div>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-hidden font-mono uppercase cursor-pointer"
          >
            <option value="all">All levels</option>
            <option value="info">INFO</option>
            <option value="treasury">TREASURY</option>
            <option value="security">SECURITY</option>
            <option value="warning">WARNING</option>
          </select>
        </div>
      </div>

      {/* RISK ASSESSMENT PANEL */}
      <div className="bg-gradient-to-r from-white to-[#1D2024] border border-slate-200 p-6 shadow-md rounded-2xl flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Activity className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-sm font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>AI Risk Assessment & Pattern Analysis</span>
            </h2>
            <p className="text-[10px] text-zinc-450 font-mono tracking-wider mt-1.5 leading-relaxed max-w-lg">
              Leverage Gemini AI to analyze all ledger transaction patterns for anomalies, concentration risks, and unusual spending behavior for this entity.
            </p>
          </div>
          <button
            onClick={handleGenerateRiskAssessment}
            disabled={isAssessing}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-900 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAssessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span className="font-mono text-amber-500">Scanning Ledger...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="font-mono">Generate Report</span>
              </>
            )}
          </button>
        </div>

        {riskSummary && (
          <div className="relative z-10 mt-2 p-4 bg-slate-50/80 border border-amber-900/30 rounded-xl">
            <div className="prose prose-invert prose-p:text-xs prose-p:text-slate-700 prose-headings:text-amber-500 prose-strong:text-slate-800 w-full max-w-none text-xs font-mono leading-relaxed">
               <div className="markdown-body">
                <Markdown>{riskSummary}</Markdown>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* AUDIT LOG TIMELINE */}
      <div className="bg-white border border-slate-200 shadow-md overflow-hidden text-xs rounded-2xl">
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center font-mono">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-555" />
            <span>System Audits Log Journal</span>
          </span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{filteredLogs.length} Records Rendered</span>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((l) => {
              const actorProfile = profiles.find(p => p.id === l.actorId);
              const actorName = actorProfile ? `${actorProfile.fullName} (${actorProfile.email})` : 'SYSTEM KERNEL';
              const level = (l.details.level || 'info') as string;
              const detailStr = (l.details.comment || JSON.stringify(l.details)) as string;
              const ip = (l.details.ip || '127.0.0.1') as string;

              let levelBadge = 'bg-slate-50 border-slate-200 text-slate-600';
              if (level === 'security') levelBadge = 'bg-rose-955/20 border-rose-900 text-rose-455 font-bold';
              else if (level === 'warning') levelBadge = 'bg-amber-955/20 border-amber-900 text-amber-400 font-bold';
              else if (level === 'treasury') levelBadge = 'bg-indigo-955/20 border-indigo-900 text-indigo-400 font-bold';

              return (
                <div key={l.id} className="p-4 hover:bg-slate-50/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-slate-500 font-semibold">{l.createdAt.slice(0, 19).replace('T', ' ')}</span>
                      <span className={`px-2 py-0.5 text-[8px] font-bold border rounded-2xl font-mono uppercase tracking-wider ${levelBadge}`}>
                        {level}
                      </span>
                    </div>
                    <div className="text-slate-900 font-display text-sm font-semibold tracking-tight">{l.action}</div>
                    <p className="text-slate-600 font-sans leading-relaxed text-xs">{detailStr}</p>
                  </div>

                  <div className="shrink-0 flex flex-col items-start md:items-end gap-1 border-t border-slate-200/20 md:border-0 pt-2 md:pt-0">
                    <div className="text-[10px] font-bold text-zinc-350 font-sans tracking-wide">{actorName}</div>
                    <div className="flex items-center gap-1 font-mono text-[9px] text-slate-500">
                      <Monitor className="w-3 h-3 text-zinc-600" />
                      <span>Caller IP: <b className="text-slate-600">{ip}</b></span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-zinc-550 font-mono uppercase tracking-wider">
              No matching security logs located under choices.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
