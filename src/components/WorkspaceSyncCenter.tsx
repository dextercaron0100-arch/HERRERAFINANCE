/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2,
  Check,
  X,
  AlertOctagon,
  Clock,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
  FileSignature,
  FileText,
  Mail,
  ListFilter,
  Calendar,
  Layers,
  Power,
  Cpu,
  Loader2,
  AlertCircle,
  CheckSquare,
  Sparkles,
  RefreshCw,
  LogOut,
  CheckCircle2,
  XCircle,
  Database,
  ExternalLink
} from 'lucide-react';
import {
  getTransactions,
  reviewTransaction,
  getUserRole,
  getProfiles,
  getCompanies,
  writeAuditLog
} from '../data/mockDatabase';
import {
  isWorkspaceConnected,
  getGoogleUser,
  sendGmailNotification,
  createCalendarEvent,
  createGoogleTask,
  exportReportToGoogleDoc,
  logoutWorkspace
} from '../lib/workspace';
import { Transaction } from '../types';

interface WorkspaceSyncCenterProps {
  userId: string;
  companyId: string;
  onAuditLogged: () => void;
  onRequestOAuth: () => void;
}

export default function WorkspaceSyncCenter({
  userId,
  companyId,
  onAuditLogged,
  onRequestOAuth
}: WorkspaceSyncCenterProps) {
  // Primary Tabs
  const [activeTab, setActiveTab] = useState<'approvals' | 'integrations' | 'history'>('approvals');
  
  // Workspace sync states
  const [connected, setConnected] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);

  // Review states
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [remarks, setRemarks] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [gmailStatus, setGmailStatus] = useState('');

  // Integration Tools States
  const [mailTo, setMailTo] = useState('recipient@example.com');
  const [mailSub, setMailSub] = useState('[Treasury] Ledger Transaction Sync Notice');
  const [mailStatus, setMailStatus] = useState('');

  const [calTitle, setCalTitle] = useState('Workspace Treasury Reconciliation Audit');
  const [calDesc, setCalDesc] = useState('Synchronize receipts, log adjustment logs, and sign draft journal balances.');
  const [calDate, setCalDate] = useState('2026-06-25T14:30:00');
  const [calStatus, setCalStatus] = useState('');

  const [taskTitle, setTaskTitle] = useState('Audit Blesscent Ledger AP/AR Signatures');
  const [taskStatus, setTaskStatus] = useState('');

  const [docTitle, setDocTitle] = useState('Corporate Treasury Reconciliation Report');
  const [docStatus, setDocStatus] = useState('');

  const companies = getCompanies();
  const profiles = getProfiles();
  const txns = getTransactions(userId, companyId);
  const currentRole = getUserRole(userId, companyId);
  const currentProfile = profiles.find(p => p.id === userId);

  // Synchronize Google Workspace connection status
  useEffect(() => {
    const checkState = () => {
      const active = isWorkspaceConnected();
      setConnected(active);
      if (active) {
        setGoogleUser(getGoogleUser());
      } else {
        setGoogleUser(null);
      }
    };
    checkState();
    const timer = setInterval(checkState, 2000);
    return () => clearInterval(timer);
  }, []);

  // Peso Format
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(num);
  };

  // Filter pending queues vs completed reviews
  const { queue, history } = useMemo(() => {
    const q = txns.filter(t => t.status === 'pending');
    q.sort((a, b) => b.amount - a.amount);

    const h = txns.filter(t => t.status !== 'pending');
    h.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return { queue: q, history: h };
  }, [txns]);

  // Auth controls
  const handleConnectClick = () => {
    onRequestOAuth();
  };

  const handleDisconnectClick = () => {
    logoutWorkspace();
    setConnected(false);
    setGoogleUser(null);
    onAuditLogged();
    writeAuditLog(userId, companyId, 'OAUTH_SESSION_DISCONNECTED', 'oauth', userId, { comment: 'Logged out of Google Workspace context safely', level: 'info' });
  };

  // Handle Review execution
  const handleReviewExecute = async (action: 'approved' | 'rejected') => {
    if (!selectedTxn) return;
    setReviewError('');
    setReviewSuccess('');
    setGmailStatus('');

    const { error } = reviewTransaction(userId, selectedTxn.id, action, remarks);

    if (error) {
      setReviewError(error);
      return;
    }

    setReviewSuccess(`Entry ${selectedTxn.id} ${action} successfully! Audit logs captured.`);
    onAuditLogged();

    // Send Workspace Notification
    const encoder = profiles.find(p => p.id === selectedTxn.encodedBy);
    if (encoder) {
      const gConnected = isWorkspaceConnected();
      const subject = `[Workspace Sync Header] Txn #${selectedTxn.id} Review Notification`;
      const emailBody = `
        <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #24272C; border-radius: 12px; padding: 24px; color: #E5E7EB; background: #141618;">
          <h2 style="color: ${action === 'approved' ? '#00B67A' : '#F43F5E'}; margin-top: 0; font-family: sans-serif; letter-spacing: -0.025em;">Reconciliation Signoff: ${action.toUpperCase()}</h2>
          <p style="font-size: 14px; text-transform: uppercase; font-family: monospace; color: #94A3B8;">Status synced directly to connected Workspace hub.</p>
          <hr style="border-color: #24272C; margin: 16px 0;" />
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <tr style="background: #181A1C;"><td style="padding: 10px; font-weight: bold; color: #94A3B8;">Tracking Reference:</td><td style="padding: 10px; font-family: monospace; font-weight: bold; color: #FFFFFF;">#${selectedTxn.id}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold; color: #94A3B8;">Corporate Entity:</td><td style="padding: 10px; color: #FFFFFF;">${companies.find(c => c.id === selectedTxn.companyId)?.name}</td></tr>
            <tr style="background: #181A1C;"><td style="padding: 10px; font-weight: bold; color: #94A3B8;">Ledger Flow:</td><td style="padding: 10px; color: #FFFFFF; font-weight: bold;">${selectedTxn.type.toUpperCase().replace('_', ' ')}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold; color: #94A3B8;">Principal Amount:</td><td style="padding: 10px; font-weight: bold; color: #00B67A; font-size: 15px;">${formatPeso(selectedTxn.amount)}</td></tr>
            <tr style="background: #181A1C;"><td style="padding: 10px; font-weight: bold; color: #94A3B8;">Compliance Purpose:</td><td style="padding: 10px; color: #FFFFFF;">${selectedTxn.purpose}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold; color: #94A3B8;">Signatures Desk Remarks:</td><td style="padding: 10px; color: #F43F5E; font-style: italic;">${remarks || 'Approved and fully balanced with standard invoices.'}</td></tr>
          </table>
          <p style="font-size: 11px; color: #64748B; border-top: 1px solid #24272C; padding-top: 12px; margin-top: 24px; font-family: monospace;">This dispatch was authorized using Google Workspace API OAuth channels.</p>
        </div>
      `;

      if (gConnected) {
        setGmailStatus('Connecting Workspace channel to dispatch secure transmission...');
        const gmailRes = await sendGmailNotification(encoder.email, subject, emailBody);
        if (gmailRes.success) {
          setGmailStatus('✅ Gmail signoff notice delivered safely to company encoder.');
        } else {
          setGmailStatus(`⚠️ Workspace sync skipped: ${gmailRes.message}`);
        }
      } else {
        setGmailStatus('ℹ️ Local cache stored. Google Workspace credentials required for real SMTP route.');
      }
    }

    setTimeout(() => {
      setSelectedTxn(null);
      setRemarks('');
      setReviewSuccess('');
      setGmailStatus('');
    }, 2000);
  };

  // Dispatch individual sync actions
  const handleSendGmailTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) return;
    setMailStatus('Connecting Workspace API standard envelope...');

    const body = `
      <div style="font-family: sans-serif; max-width: 550px; border: 1px solid #24272C; border-radius: 12px; padding: 20px; color: #E5E7EB; background: #141618;">
        <h3 style="color: #00B67A; margin-top: 0;">Workspace Center Integrity Hook</h3>
        <p>This is an automated analytical check validating active Google Workspace routing protocols.</p>
        <p style="background: #181A1C; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 11px; border: 1px solid #24272C;">
          Dispatch Stamp: <b>${new Date().toISOString()}</b>
        </p>
        <p style="font-weight: bold; font-family: monospace; color: #00B67A;">Status: ROUTE_STABLE_V2</p>
      </div>
    `;

    const res = await sendGmailNotification(mailTo, mailSub, body);
    if (res.success) {
      setMailStatus('✅ Dispatch successful! Check sent logs.');
      onAuditLogged();
    } else {
      setMailStatus(`❌ Send Fault: ${res.message}`);
    }
  };

  const handleCreateCalendar = async () => {
    if (!connected) return;
    setCalStatus('Attempting Google Agenda slot reservation...');

    const res = await createCalendarEvent(calTitle, calDesc, calDate);
    if (res.success) {
      setCalStatus('✅ Agenda reminder synchronized onto corporate calendar!');
      onAuditLogged();
    } else {
      setCalStatus(`❌ Calendar Fault: ${res.message}`);
    }
  };

  const handleCreateTask = async () => {
    if (!connected) return;
    setTaskStatus('Injecting task checklist object into Workspace standard...');

    const res = await createGoogleTask(taskTitle, 'Corporate Workspace Treasury reconciliation checklist required by audits.');
    if (res.success) {
      setTaskStatus('✅ Compliance check synced directly into Google Tasks!');
      onAuditLogged();
    } else {
      setTaskStatus(`❌ Task Fault: ${res.message}`);
    }
  };

  const handleExportDocAndDrive = async () => {
    if (!connected) return;
    setDocStatus('Compiling analytical statement files...');

    const recent = txns.slice(0, 10);
    let docBodyStr = `FINANCIAL RECONCILIATION REPORT\nEntity Context: ALL RECORDINGS\nReconciled On: ${new Date().toLocaleDateString()}\n=================================\n\nThis executive compliant log tracks cash flows logged inside corporate records.\n\nRECENT SIGNED JOURNAL ENTRIES:\n`;
    recent.forEach(t => {
      docBodyStr += `- [${t.txnDate}] ID #${t.id} | Flow: ${t.type.toUpperCase()} | Value: ${formatPeso(t.amount)} | Clerk: ${t.responsiblePerson} | Reason: ${t.purpose}\n`;
    });

    const res = await exportReportToGoogleDoc(docTitle, docBodyStr);
    if (res.success) {
      setDocStatus('✅ Treasury compliant document signed and locked in Google Drive!');
      onAuditLogged();
    } else {
      setDocStatus(`❌ Drive Exporter Fault: ${res.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. PREMIUM HEADER / OAUTH STATUS PANEL */}
      <div className="bg-[#141618] border border-[#24272C] rounded-2xl p-6 relative overflow-hidden shadow-xl">
        {/* Decorative subtle vector coordinates lines */}
        <div className="absolute top-0 right-0 w-32 h-[1px] bg-gradient-to-l from-[#00B67A]/30 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-24 h-[1px] bg-gradient-to-r from-[#00B67A]/15 to-transparent"></div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-[#181A1C] border border-[#24272C] text-white rounded-xl shrink-0 shadow-inner">
              <Layers className="w-6 h-6 text-[#00B67A] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Workspace Sync Center</span>
                <span className="px-2 py-0.5 bg-[#00B67A]/10 text-[#00B67A] text-[9px] rounded-full font-mono border border-[#00B67A]/20 font-bold uppercase">SECURE DIRECT NODE</span>
              </div>
              <h1 className="text-xl md:text-2xl font-light font-display text-white tracking-tight mt-0.5">
                Corporate Workspace &amp; Ledger Sync Desk
              </h1>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Reconcile corporate expenditures, sign pending entry cards, and synchronize ledger journals to corporate Google Workspace (Gmail notifications, Google Agenda schedules, Tasks lists, and Google Drive docs) in a unified automated cockpit.
              </p>
            </div>
          </div>

          {/* OAUTH CONNECTION STATUS */}
          <div className="bg-[#181A1C] border border-[#24272C] p-4 rounded-xl flex items-center justify-between xl:justify-end gap-6 shrink-0 xl:min-w-[340px]">
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block font-mono">Google Account Link</span>
              {connected ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00B67A] animate-ping"></div>
                  <span className="text-xs font-bold text-white font-sans">{googleUser ? googleUser.email : 'Connected Account'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                  <span className="text-xs font-semibold text-zinc-400">Sandbox Trial Mode</span>
                </div>
              )}
            </div>

            <div>
              {connected ? (
                <button
                  onClick={handleDisconnectClick}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer uppercase tracking-wider"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnectClick}
                  className="px-4 py-2 bg-[#00B67A] hover:bg-[#009E6B] text-white border border-transparent rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-lg shadow-[#00B67A]/20 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <span>Connect account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* COMPACT SUB-NAVIGATION TABS */}
        <div className="flex border-b border-[#24272C] mt-8 pt-1 overflow-x-auto whitespace-nowrap">
          {[
            { id: 'approvals', label: `Pending Reviews (${queue.length})`, icon: FileSignature },
            { id: 'integrations', label: 'Google Workspace sync tools', icon: Cpu },
            { id: 'history', label: `Decision trails history (${history.length})`, icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedTxn(null);
                  setRemarks('');
                }}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  active 
                    ? 'border-[#00B67A] text-[#00B67A] bg-gradient-to-t from-[#00B67A]/5 to-transparent' 
                    : 'border-transparent text-zinc-500 hover:text-white hover:bg-zinc-800/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#00B67A]' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN WORKSPACE CHANNELS RENDERING */}
      {activeTab === 'approvals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* QUEUE OF JOURNAL ENTRIES */}
          <div className="lg:col-span-2 bg-[#141618] border border-[#24272C] shadow-xl rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#24272C] flex items-center justify-between bg-[#181A1C]">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 font-mono">
                <ListFilter className="w-4 h-4 text-[#00B67A]" />
                <span>Pending reconciliation register queue</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono uppercase">Ordered by Amount Desc</span>
            </div>

            <div className="divide-y divide-[#24272C]/50">
              {queue.length > 0 ? (
                queue.map((t) => {
                  const encoder = profiles.find(p => p.id === t.encodedBy);
                  const isOwn = t.encodedBy === userId;
                  const isTier3 = t.amount > 50000;
                  const isTier2 = t.amount > 10000;
                  const isSelected = selectedTxn?.id === t.id;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTxn(t);
                        setRemarks('');
                        setReviewError('');
                      }}
                      className={`p-5 transition-all cursor-pointer select-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 ${
                        isSelected
                          ? 'border-l-[#00B67A] bg-[#1a1c1f]/40'
                          : 'border-l-transparent hover:bg-[#181A1C]/20'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[9px] text-zinc-500 font-bold uppercase">Txn ID: #{t.id}</span>
                          <span className="px-2 py-0.5 bg-[#181A1C] text-zinc-400 font-bold font-mono text-[8px] border border-[#24272C] rounded-lg uppercase tracking-wider">
                            {t.type.replace('_', ' ')}
                          </span>
                          {isOwn && (
                            <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-bold rounded-lg font-mono flex items-center gap-0.5 uppercase tracking-wider">
                              <ShieldAlert className="w-3 h-3 text-rose-400" />
                              <span>Self Drafted Entry</span>
                            </span>
                          )}
                          {isTier3 && (
                            <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[8px] font-bold rounded-lg font-mono uppercase tracking-wider">
                              Tier 3 Escalate
                            </span>
                          )}
                          {isTier2 && !isTier3 && (
                            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[8px] font-bold rounded-lg font-mono uppercase tracking-wider">
                              Tier 2 Escalate
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-white truncate max-w-md pr-4">{t.purpose}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono uppercase">
                          <span>Encoder: <b className="text-zinc-300">{encoder?.fullName || 'Finance Executive'}</b></span>
                          <span>•</span>
                          <span>Value Date: <b className="text-zinc-300">{t.txnDate}</b></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t border-[#24272C]/40 sm:border-0 pt-3 sm:pt-0">
                        <div className="text-base font-bold font-mono text-[#00B67A]">{formatPeso(t.amount)}</div>
                        <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg text-[9px] font-bold bg-[#181A1C] text-amber-400 border border-amber-500/20 font-mono tracking-wider uppercase">
                          Pending Sig
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-16 text-center space-y-3">
                  <div className="w-12 h-12 bg-[#181A1C] border border-[#24272C] rounded-xl flex items-center justify-center mx-auto text-[#00B67A]">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-center text-zinc-400 text-xs font-mono uppercase tracking-wider max-w-sm mx-auto">
                    Excellent! All analytical journal transactions are fully authorized and reconciled with Workspace records.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RECONCILIATION DRUM WORKSPACE DRAWERS */}
          <div className="bg-[#141618] border border-[#24272C] shadow-xl p-6 rounded-2xl space-y-5">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono border-b border-[#24272C] pb-3 flex items-center gap-2">
              <FileSignature className="w-4.5 h-4.5 text-[#00B67A]" />
              <span>Review Workspace Controls</span>
            </h2>

            {selectedTxn ? (
              <div className="space-y-5 animate-fadeIn">
                {/* METADATA DESK CARD */}
                <div className="p-4 bg-[#181A1C] border border-[#24272C] space-y-3 rounded-xl font-mono text-xs text-zinc-300">
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 uppercase tracking-widest font-bold border-b border-[#24272C] pb-2">
                    <span>Ledger Meta Envelope</span>
                    <span>#{selectedTxn.id}</span>
                  </div>
                  <div className="text-sm font-semibold text-white tracking-tight leading-snug">{selectedTxn.purpose}</div>
                  
                  <div className="space-y-1 pt-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 uppercase text-[9px]">Capital Flow Value:</span>
                      <span className="font-mono font-bold text-[#00B67A]">{formatPeso(selectedTxn.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 uppercase text-[9px]">Encoder Staff:</span>
                      <span className="text-zinc-300 font-semibold">{profiles.find(p => p.id === selectedTxn.encodedBy)?.fullName || 'Finance Staff'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 uppercase text-[9px]">Accountable Staff:</span>
                      <span className="text-zinc-300 font-semibold">{selectedTxn.responsiblePerson}</span>
                    </div>
                  </div>
                  
                  {selectedTxn.receiptPath && (
                    <div className="pt-3 border-t border-[#24272C]">
                      <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Reconciliation Bill Attachment:</span>
                      <div className="border border-[#24272C] bg-[#141618] p-1.5 rounded-xl flex items-center justify-center overflow-hidden">
                        <img 
                          src={selectedTxn.receiptPath} 
                          alt="Journal ledger proof voucher" 
                          className="max-h-36 object-contain rounded-lg shadow-inner" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* POLICIES AND GUARDS */}
                {selectedTxn.encodedBy === userId ? (
                  <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-mono flex items-start gap-2 leading-relaxed">
                    <AlertOctagon className="w-5 h-5 shrink-0 text-rose-500 animate-bounce" />
                    <span>Compliance Conflict of Interest: You are strictly forbidden from signing or authorizing your own encoded transaction entries. Controls locked.</span>
                  </div>
                ) : selectedTxn.amount > 50000 && currentRole !== 'company_admin' ? (
                  <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-mono flex items-start gap-2 leading-relaxed">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
                    <span>Treasury Protocol Limit exceeded: Budgets above ₱50,000 threshold strictly require Company Admin authorization. Level 2 Approver authorization restricted.</span>
                  </div>
                ) : selectedTxn.amount > 10000 && currentRole === 'approver' ? (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-mono flex items-start gap-2 leading-relaxed">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
                    <span>Treasury Protocol Limit exceeded: Budgets above ₱10,000 threshold require Finance Officer / Company Admin signatures. Level 1 authorization restricted.</span>
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
                    {/* REMARKS INPUT */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Signatures remarks / Sync metadata</span>
                      </label>
                      <textarea 
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="State reasonings, audit stamps, or remarks..."
                        className="w-full text-xs p-3 bg-[#181A1C] border border-[#24272C] text-white focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl h-20 font-mono transition-all"
                      />
                    </div>

                    {/* ACTIONS CONTROLS */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button 
                        onClick={() => handleReviewExecute('rejected')}
                        disabled={remarks.trim() === ''}
                        className="py-3 border border-[#24272C] hover:border-rose-500/30 text-rose-400 hover:text-rose-350 bg-[#181A1C] hover:bg-rose-950/20 font-bold font-mono uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none"
                        title="Enter remarks first before denying items"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject draft</span>
                      </button>
                      <button 
                        onClick={() => handleReviewExecute('approved')}
                        className="py-3 bg-white hover:bg-zinc-200 text-black font-bold font-mono uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve sign</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* DYNAMIC TELEMETRY SYNC MESSAGES */}
                {reviewError && (
                  <p className="p-3 bg-rose-500/5 border border-rose-500/20 text-rose-450 text-[10px] font-mono leading-relaxed rounded-xl">
                    {reviewError}
                  </p>
                )}
                {reviewSuccess && (
                  <p className="p-3 bg-[#00B67A]/5 border border-[#00B67A]/20 text-[#00B67A] text-[11px] font-mono animate-pulse rounded-xl">
                    {reviewSuccess}
                  </p>
                )}
                {gmailStatus && (
                  <div className="p-3 bg-[#181A1C] border border-[#24272C] rounded-xl text-[10px] text-zinc-400 font-mono flex items-start gap-2 leading-relaxed">
                    <Mail className="w-3.5 h-3.5 text-[#00B67A] shrink-0 mt-0.5" />
                    <span>{gmailStatus}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#181A1C]/20 border border-dashed border-[#24272C] rounded-2xl p-6">
                <FileCheck2 className="w-8 h-8 text-zinc-650 mx-auto mb-2.5 animate-bounce" />
                <p className="text-xs text-zinc-550 font-mono uppercase tracking-wider">
                  Select a draft card on the left to review telemetry values &amp; trigger automated Workspace sync.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {!connected && (
            <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl flex flex-col sm:flex-row items-start gap-4 shadow-md">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1 text-xs text-amber-300">
                <h4 className="font-bold text-amber-200 font-mono uppercase tracking-wider text-sm">Interactive Sandbox Telemetry Mode</h4>
                <p className="leading-relaxed font-mono text-[11px]">
                  Real account linkage is configured through standard client-side API fallbacks. You can interact with and trigger these tools immediately below to test mock syncing records! Secure direct OAuth is safely initialized via "Connect Corporate Google Account".
                </p>
              </div>
            </div>
          )}

          {/* INTEGRATION ACTIONS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* TOOL 01: GMAIL MESSAGING */}
            <div className="bg-[#141618] border border-[#24272C] p-6 rounded-2xl space-y-4 shadow-lg ">
              <h2 className="text-xs font-semibold text-white font-mono uppercase tracking-widest border-b border-[#24272C] pb-3 flex items-center gap-2">
                <Mail className="w-4.5 h-4.5 text-rose-500" />
                <span>Integrated Gmail Dispatch Center</span>
              </h2>

              <form onSubmit={handleSendGmailTest} className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">Recipient Email</span>
                  <input 
                    type="email" 
                    value={mailTo} 
                    onChange={(e) => setMailTo(e.target.value)} 
                    className="w-full text-xs p-3 bg-[#181A1C] border border-[#24272C] text-white focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-mono placeholder:text-zinc-650 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">Alert Subject Header</span>
                  <input 
                    type="text" 
                    value={mailSub} 
                    onChange={(e) => setMailSub(e.target.value)} 
                    className="w-full text-xs p-3 bg-[#181A1C] border border-[#24272C] text-white focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-mono placeholder:text-zinc-650 transition-all"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <p className="text-[9px] text-zinc-550 font-mono uppercase tracking-tight">Auto-assembles transaction summaries with design tags.</p>
                  <button 
                    type="submit"
                    className="px-5 py-3 bg-[#181A1C] hover:bg-[#1C1E22] border border-[#24272C] hover:border-[#00B67A] text-white font-mono text-[10px] tracking-wider uppercase rounded-xl cursor-pointer transition-all shrink-0 select-none"
                  >
                    Dispatch Gmail Alert
                  </button>
                </div>
              </form>
              
              {mailStatus && (
                <p className="p-3 bg-[#181A1C] border border-[#24272C] text-[10px] text-zinc-400 rounded-xl font-mono leading-relaxed">
                  {mailStatus}
                </p>
              )}
            </div>

            {/* TOOL 02: CALENDAR SCHEDULER */}
            <div className="bg-[#141618] border border-[#24272C] p-6 rounded-2xl space-y-4 shadow-lg">
              <h2 className="text-xs font-semibold text-white font-mono uppercase tracking-widest border-b border-[#24272C] pb-3 flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-blue-400" />
                <span>Google Calendar Scheduler</span>
              </h2>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">Appointment Header Title</span>
                  <input 
                    type="text" 
                    value={calTitle} 
                    onChange={(e) => setCalTitle(e.target.value)} 
                    className="w-full text-xs p-3 bg-[#181A1C] border border-[#24272C] text-white focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-mono placeholder:text-zinc-650 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">Date Time Stamp</span>
                    <input 
                      type="datetime-local" 
                      value={calDate} 
                      onChange={(e) => setCalDate(e.target.value)} 
                      className="w-full text-xs p-3 bg-[#181A1C] border border-[#24272C] text-white focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-mono transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">Brief Agenda Description</span>
                    <input 
                      type="text" 
                      value={calDesc} 
                      onChange={(e) => setCalDesc(e.target.value)} 
                      className="w-full text-xs p-3 bg-[#181A1C] border border-[#24272C] text-white focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-mono placeholder:text-zinc-650 transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={handleCreateCalendar}
                    className="px-5 py-3 bg-[#181A1C] hover:bg-[#1C1E22] border border-[#24272C] hover:border-[#00B67A] text-white font-mono text-[10px] tracking-wider uppercase rounded-xl cursor-pointer transition-all select-none"
                  >
                    Sync Calendar slot
                  </button>
                </div>
              </div>

              {calStatus && (
                <p className="p-3 bg-[#181A1C] border border-[#24272C] text-[10px] text-zinc-400 rounded-xl font-mono leading-relaxed">
                  {calStatus}
                </p>
              )}
            </div>

            {/* TOOL 03: GOOGLE TASKS CHECKLISTS */}
            <div className="bg-[#141618] border border-[#24272C] p-6 rounded-2xl space-y-4 shadow-lg">
              <h2 className="text-xs font-semibold text-white font-mono uppercase tracking-widest border-b border-[#24272C] pb-3 flex items-center gap-2">
                <CheckSquare className="w-4.5 h-4.5 text-[#00B67A]" />
                <span>Google Tasks compliance checklist</span>
              </h2>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">Compliance Task Detail</span>
                  <input 
                    type="text" 
                    value={taskTitle} 
                    onChange={(e) => setTaskTitle(e.target.value)} 
                    className="w-full text-xs p-3 bg-[#181A1C] border border-[#24272C] text-white focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-mono placeholder:text-zinc-650 transition-all"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={handleCreateTask}
                    className="px-5 py-3 bg-[#181A1C] hover:bg-[#1C1E22] border border-[#24272C] hover:border-[#00B67A] text-white font-mono text-[10px] tracking-wider uppercase rounded-xl cursor-pointer transition-all select-none"
                  >
                    Pin task item
                  </button>
                </div>
              </div>

              {taskStatus && (
                <p className="p-3 bg-[#181A1C] border border-[#24272C] text-[10px] text-zinc-400 rounded-xl font-mono leading-relaxed">
                  {taskStatus}
                </p>
              )}
            </div>

            {/* TOOL 04: GOOGLE DOCS EXPORTER */}
            <div className="bg-[#141618] border border-[#24272C] p-6 rounded-2xl space-y-4 shadow-lg">
              <h2 className="text-xs font-semibold text-white font-mono uppercase tracking-widest border-b border-[#24272C] pb-3 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-emerald-400" />
                <span>Google Docs Statement compiler</span>
              </h2>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">Google Drive Document Title</span>
                  <input 
                    type="text" 
                    value={docTitle} 
                    onChange={(e) => setDocTitle(e.target.value)} 
                    className="w-full text-xs p-3 bg-[#181A1C] border border-[#24272C] text-white focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-mono placeholder:text-zinc-650 transition-all"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={handleExportDocAndDrive}
                    className="px-5 py-3 bg-[#181A1C] hover:bg-[#1C1E22] border border-[#24272C] hover:border-[#00B67A] text-white font-mono text-[10px] tracking-wider uppercase rounded-xl cursor-pointer transition-all select-none"
                  >
                    Compile document report
                  </button>
                </div>
              </div>

              {docStatus && (
                <p className="p-3 bg-[#181A1C] border border-[#24272C] text-[10px] text-zinc-400 rounded-xl font-mono leading-relaxed">
                  {docStatus}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-[#141618] border border-[#24272C] shadow-xl rounded-2xl overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-[#24272C] bg-[#181A1C] flex items-center gap-2">
            <Database className="w-4 h-4 text-zinc-400" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
              Historical analytical signatures signoff ledger log
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#181A1C] text-zinc-400 font-medium uppercase tracking-[1px] font-mono border-b border-[#24272C]">
                <tr>
                  <th className="p-4 border-b border-[#24272C]">Txn ID</th>
                  <th className="p-4 border-b border-[#24272C]">Decision Date</th>
                  <th className="p-4 border-b border-[#24272C]">Type</th>
                  <th className="p-4 border-b border-[#24272C]">Original Value</th>
                  <th className="p-4 border-b border-[#24272C]">Purpose Statement</th>
                  <th className="p-4 border-b border-[#24272C]">Auditing Stamp</th>
                  <th className="p-4 border-b border-[#24272C]">Signatures Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24272C]/40 text-zinc-300 font-medium">
                {history.length > 0 ? (
                  history.map((t, idx) => {
                    return (
                      <tr key={idx} className="hover:bg-[#181A1C]/20 transition-all font-mono text-[11px]">
                        <td className="p-4 text-zinc-550 font-bold">
                          #{t.id}
                        </td>
                        <td className="p-4 whitespace-nowrap text-zinc-400">
                          {t.updatedAt.slice(0, 10)} {t.updatedAt.slice(11, 16)}
                        </td>
                        <td className="p-4">
                          <span className="uppercase text-[9px] font-bold text-zinc-400 bg-[#181A1C] border border-[#24272C] px-1.5 py-0.5 rounded-lg">
                            {t.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-white whitespace-nowrap">
                          {formatPeso(t.amount)}
                        </td>
                        <td className="p-4 max-w-xs truncate text-zinc-200">
                          {t.purpose}
                        </td>
                        <td className="p-4">
                          {t.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#00B67A]/10 text-[#00B67A] border border-[#00B67A]/20 text-[9px] font-bold rounded-lg uppercase">
                              <Check className="w-3 h-3" />
                              <span>Authorized</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold rounded-lg uppercase">
                              <X className="w-3 h-3" />
                              <span>Returned</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 max-w-xs truncate text-zinc-500 italic">
                          {t.status === 'rejected' ? 'Returned to encoder: lack of formal invoice/receipt.' : 'Verified, balanced, and authorized.'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-zinc-550 font-mono uppercase tracking-wider">
                      No historical finalized decisions located under current query filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
