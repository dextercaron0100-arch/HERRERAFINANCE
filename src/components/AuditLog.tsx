/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  ShieldCheck,
  Layers,
  Monitor
} from 'lucide-react';
import { getAuditLogs, getProfiles } from '../data/mockDatabase';

interface AuditLogComponentProps {
  userId: string;
  companyId: string;
}

export default function AuditLog({ userId, companyId }: AuditLogComponentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');

  const logs = getAuditLogs(userId, companyId);
  const profiles = getProfiles();

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

  return (
    <div className="space-y-6">
      {/* HEADER SECTION PANEL */}
      <div className="bg-[#181A1C] border border-[#24272C] p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl">
        <div>
          <h1 className="text-base font-display font-bold text-white tracking-tight flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-zinc-400 animate-pulse" />
            <span>Immutable Integrity Security Logs</span>
          </h1>
          <p className="text-[10px] text-zinc-450 font-mono uppercase tracking-wider mt-0.5 font-semibold">Strictly tracks accounting adjustments, salary modifications and reviews decisions.</p>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row gap-2 select-none w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actor email, action..."
              className="pl-8 pr-3 py-1.5 bg-[#141618] border border-[#24272C] rounded-2xl text-xs text-white focus:outline-hidden focus:border-white w-full sm:w-64 font-mono placeholder:text-zinc-600"
            />
          </div>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-2.5 py-1.5 bg-[#141618] border border-[#24272C] rounded-2xl text-xs text-white focus:outline-hidden font-mono uppercase cursor-pointer"
          >
            <option value="all">All levels</option>
            <option value="info">INFO</option>
            <option value="treasury">TREASURY</option>
            <option value="security">SECURITY</option>
            <option value="warning">WARNING</option>
          </select>
        </div>
      </div>

      {/* AUDIT LOG TIMELINE */}
      <div className="bg-[#181A1C] border border-[#24272C] shadow-md overflow-hidden text-xs rounded-2xl">
        <div className="p-4 border-b border-[#24272C] bg-[#141618] flex justify-between items-center font-mono">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-555" />
            <span>System Audits Log Journal</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{filteredLogs.length} Records Rendered</span>
        </div>

        <div className="divide-y divide-[#24272C]">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((l) => {
              const actorProfile = profiles.find(p => p.id === l.actorId);
              const actorName = actorProfile ? `${actorProfile.fullName} (${actorProfile.email})` : 'SYSTEM KERNEL';
              const level = (l.details.level || 'info') as string;
              const detailStr = (l.details.comment || JSON.stringify(l.details)) as string;
              const ip = (l.details.ip || '127.0.0.1') as string;

              let levelBadge = 'bg-zinc-900 border-zinc-800 text-zinc-400';
              if (level === 'security') levelBadge = 'bg-rose-955/20 border-rose-900 text-rose-455 font-bold';
              else if (level === 'warning') levelBadge = 'bg-amber-955/20 border-amber-900 text-amber-400 font-bold';
              else if (level === 'treasury') levelBadge = 'bg-indigo-955/20 border-indigo-900 text-indigo-400 font-bold';

              return (
                <div key={l.id} className="p-4 hover:bg-zinc-900/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-zinc-500 font-semibold">{l.createdAt.slice(0, 19).replace('T', ' ')}</span>
                      <span className={`px-2 py-0.5 text-[8px] font-bold border rounded-2xl font-mono uppercase tracking-wider ${levelBadge}`}>
                        {level}
                      </span>
                    </div>
                    <div className="text-white font-display text-sm font-semibold tracking-tight">{l.action}</div>
                    <p className="text-zinc-400 font-sans leading-relaxed text-xs">{detailStr}</p>
                  </div>

                  <div className="shrink-0 flex flex-col items-start md:items-end gap-1 border-t border-[#24272C]/20 md:border-0 pt-2 md:pt-0">
                    <div className="text-[10px] font-bold text-zinc-350 font-sans tracking-wide">{actorName}</div>
                    <div className="flex items-center gap-1 font-mono text-[9px] text-zinc-500">
                      <Monitor className="w-3 h-3 text-zinc-600" />
                      <span>Caller IP: <b className="text-zinc-400">{ip}</b></span>
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
