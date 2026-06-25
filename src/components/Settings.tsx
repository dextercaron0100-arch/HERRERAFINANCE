import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, LayoutPanelLeft, LayoutPanelTop, ArrowUp, ArrowDown, GripVertical, ListOrdered, Users, Shield, Edit2, Check, X, Plus, Trash2, Building2 } from 'lucide-react';
import { getProfiles, getRoles, getCompanies, saveProfile, saveRole, deleteRole, isGroupAdmin } from '../data/mockDatabase';
import { Profile, UserCompanyRole, Company, CompanyRole } from '../types';

interface SettingsProps {
  userId: string;
  companyId: string;
  navOrder: string[];
  setNavOrder: (order: string[]) => void;
}

const NAV_LABELS: Record<string, string> = {
  "owner_dashboard": "Owner Action Summary",
  "accounting_workbench": "Accounting Workbench",
  "dashboard": "Overview Dashboard",
  "money_flow": "Money Flow & Profit",
  "workflow": "Accounting Workflow SOPs",
  "ledger": "Transaction Journal",
  "approvals": "Approvals queue",
  "budgets": "Budgets Monitor",
  "pay_rec": "Liabilities & Assets (AP/AR)",
  "payroll": "Wages & Payroll",
  "reports": "Executive Sheets Reports",
  "cash_acc": "Cash & Bank Accounts",
  "bank_rec": "Bank Reconciliation",
  "assistant": "Intelligence Assistant",
  "vault": "Document Vault",
  "enterprise": "Enterprise Suite Hub",
  "tax_compliance": "PH TAX Compliance Hub",
  "audit_log": "Security Compliance Log",
  "workspace": "Workspace Sync Center",
  "settings": "Settings"
};

export default function Settings({ userId, companyId, navOrder, setNavOrder }: SettingsProps) {
  const [draggedItemIndex, setDraggedItemIndex] = React.useState<number | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserCompanyRole[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRoleCompanyId, setEditRoleCompanyId] = useState<string>("c-bls");
  const [editRoleValue, setEditRoleValue] = useState<CompanyRole | 'remove'>("viewer");
  const [editAllowedSections, setEditAllowedSections] = useState<string[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: '', email: '' });
  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'layout'>('layout');

  const refreshData = () => {
    setProfiles(getProfiles());
    setRoles(getRoles());
    setCompanies(getCompanies());
  };

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener("db-update", handleUpdate);
    return () => window.removeEventListener("db-update", handleUpdate);
  }, []);

  const handleUpdateGroupAdmin = (targetUserId: string, isAdmin: boolean) => {
    const profile = profiles.find(p => p.id === targetUserId);
    if (profile) {
      saveProfile({ ...profile, isGroupAdmin: isAdmin });
      refreshData();
    }
  };

  const handleUpdateRole = (targetUserId: string, targetCompanyId: string, role: CompanyRole | 'remove', allowedSections: string[]) => {
    if (role === 'remove') {
      deleteRole(targetUserId, targetCompanyId);
    } else {
      saveRole({ userId: targetUserId, companyId: targetCompanyId, role, allowedSections, createdAt: new Date().toISOString() });
    }
    refreshData();
  };

  const handleAddUser = () => {
    if (!newUser.fullName || !newUser.email) return;
    
    const newProfile: Profile = {
      id: `u-${Date.now()}`,
      fullName: newUser.fullName,
      email: newUser.email,
      isGroupAdmin: false,
      createdAt: new Date().toISOString()
    };
    
    saveProfile(newProfile);
    setNewUser({ fullName: '', email: '' });
    setIsAddingUser(false);
    refreshData();
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newOrder = [...navOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setNavOrder(newOrder);
    } else if (direction === 'down' && index < navOrder.length - 1) {
      const newOrder = [...navOrder];
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
      setNavOrder(newOrder);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    const newOrder = [...navOrder];
    const draggedItem = newOrder[draggedItemIndex];
    newOrder.splice(draggedItemIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setNavOrder(newOrder);
    setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#0D0D0D] text-white p-4 md:p-6 lg:p-8 font-sans animate-fadeIn pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3 font-mono uppercase tracking-tight">
          <SettingsIcon className="w-6 h-6 text-indigo-500" />
          Settings
        </h1>
        <p className="text-sm text-zinc-400 mt-1 font-mono uppercase tracking-wider">
          Configure platform preferences and system settings
        </p>
      </div>
      
      <div className="flex border-b border-[#24272C] mb-6">
        <button
          onClick={() => setActiveTab('layout')}
          className={`px-4 py-2 font-mono text-sm tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === 'layout'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Dashboard Layout
        </button>
        {isGroupAdmin(userId) && (
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 font-mono text-sm tracking-wider uppercase transition-colors border-b-2 ${
              activeTab === 'permissions'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Permission Management
          </button>
        )}
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-mono text-sm tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === 'general'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          General Configuration
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'layout' && (
          <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-6">
            <h2 className="text-lg font-bold font-mono tracking-tight mb-4 flex items-center gap-2 text-zinc-200">
              <LayoutPanelLeft className="w-5 h-5 text-indigo-400" />
              Interface Preferences
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-300 mb-2 font-mono flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-emerald-400" />
                  Sidebar Section Arrangement
                </h3>
                <p className="text-xs text-zinc-500 mb-4 font-mono">
                  Customize the vertical order of items in your navigation sidebar.
                </p>

                <div className="space-y-2 bg-[#141618] border border-[#24272C] rounded-lg p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {navOrder.map((id, index) => (
                    <div 
                      key={id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between p-3 bg-[#181A1C] border border-[#24272C] rounded-lg group transition-colors ${draggedItemIndex === index ? 'opacity-50 border-indigo-500/50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab active:cursor-grabbing" />
                        <span className="text-xs font-mono text-zinc-300">
                          {NAV_LABELS[id] || id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-[#24272C] rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === navOrder.length - 1}
                          className="p-1.5 hover:bg-[#24272C] rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
          
        {activeTab === 'permissions' && isGroupAdmin(userId) && (
          <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-mono tracking-tight flex items-center gap-2 text-zinc-200">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  Access & Permissions
                </h2>
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 rounded text-xs font-mono transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New User
                </button>
              </div>
              <p className="text-xs text-zinc-500 mb-6 font-mono">
                Manage all current accounts, their roles, and company access.
              </p>

              <div className="overflow-x-auto border border-[#24272C] rounded-lg">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-[#141618] border-b border-[#24272C] text-xs font-mono text-zinc-400">
                      <th className="p-3 font-medium">User Profile</th>
                      <th className="p-3 font-medium">Group Admin</th>
                      <th className="p-3 font-medium">Company Role</th>
                      <th className="p-3 font-medium">Specific Access</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {isAddingUser && (
                      <tr className="border-b border-[#24272C]/50 bg-[#1A1D21]">
                        <td className="p-3">
                          <div className="flex flex-col gap-2">
                            <input 
                              type="text" 
                              placeholder="Full Name" 
                              value={newUser.fullName}
                              onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                              className="bg-[#0D0D0D] border border-[#24272C] rounded p-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 w-full"
                            />
                            <input 
                              type="email" 
                              placeholder="Email Address" 
                              value={newUser.email}
                              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                              className="bg-[#0D0D0D] border border-[#24272C] rounded p-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 w-full"
                            />
                          </div>
                        </td>
                        <td className="p-3"><span className="text-xs text-zinc-500 font-mono">NO (Default)</span></td>
                        <td className="p-3"><span className="text-xs text-zinc-500 font-mono">Assign after creation</span></td>
                        <td className="p-3"><span className="text-xs text-zinc-500 font-mono">-</span></td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleAddUser}
                              disabled={!newUser.fullName || !newUser.email}
                              className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setIsAddingUser(false); setNewUser({fullName: '', email: ''}); }}
                              className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {profiles.map(profile => {
                      const userRole = roles.find(r => r.userId === profile.id && r.companyId === (companyId === 'all' ? editRoleCompanyId : companyId));
                      const isEditing = editingUserId === profile.id;
                      
                      return (
                        <tr key={profile.id} className="border-b border-[#24272C]/50 hover:bg-[#1A1D21] transition-colors">
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-zinc-500" />
                                {profile.fullName}
                              </span>
                              <span className="text-xs text-zinc-500 font-mono">{profile.email}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleUpdateGroupAdmin(profile.id, !profile.isGroupAdmin)}
                              className={`px-3 py-1 text-xs font-mono rounded-full border ${
                                profile.isGroupAdmin
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20'
                                  : 'bg-transparent text-zinc-500 border-zinc-700 hover:text-zinc-300'
                              } transition-colors`}
                            >
                              {profile.isGroupAdmin ? 'YES' : 'NO'}
                            </button>
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                {companyId === 'all' && (
                                  <select 
                                    value={editRoleCompanyId}
                                    onChange={(e) => setEditRoleCompanyId(e.target.value)}
                                    className="bg-[#0D0D0D] border border-[#24272C] rounded p-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                                  >
                                    {companies.map(c => (
                                      <option key={c.id} value={c.id}>{c.code}</option>
                                    ))}
                                  </select>
                                )}
                                <select 
                                  value={editRoleValue}
                                  onChange={(e) => setEditRoleValue(e.target.value as CompanyRole | 'remove')}
                                  className="bg-[#0D0D0D] border border-[#24272C] rounded p-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="owner">Owner</option>
                                  <option value="company_admin">Admin</option>
                                  <option value="finance_officer">Finance Officer</option>
                                  <option value="approver">Approver</option>
                                  <option value="viewer">Viewer</option>
                                  <option value="remove" className="text-red-400">Remove Access</option>
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                                  userRole ? 'bg-zinc-800 text-zinc-300' : 'bg-transparent text-zinc-600 border border-zinc-800'
                                }`}>
                                  {userRole ? userRole.role : 'No specific access'}
                                </span>
                                {userRole && companyId === 'all' && (
                                  <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1 rounded border border-zinc-800 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {companies.find(c => c.id === userRole.companyId)?.code || userRole.companyId}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto custom-scrollbar p-1 border border-[#24272C] rounded bg-[#0D0D0D]">
                                {Object.entries(NAV_LABELS).map(([key, label]) => (
                                  <label key={key} className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer hover:bg-[#1A1D21] p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={editAllowedSections.includes(key)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setEditAllowedSections([...editAllowedSections, key]);
                                        } else {
                                          setEditAllowedSections(editAllowedSections.filter(s => s !== key));
                                        }
                                      }}
                                      className="accent-indigo-500 cursor-pointer"
                                    />
                                    <span className="truncate">{label}</span>
                                  </label>
                                ))}
                                <span className="text-[9px] text-zinc-500 font-mono mt-1 px-1">Check to grant access. Uncheck all for default role access.</span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {userRole?.allowedSections && userRole.allowedSections.length > 0 ? (
                                  userRole.allowedSections.map(section => (
                                    <span key={section} className="text-[10px] text-zinc-400 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50 truncate max-w-[120px]" title={NAV_LABELS[section] || section}>
                                      {NAV_LABELS[section] || section}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-zinc-600 font-mono italic">Role defaults</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    handleUpdateRole(profile.id, companyId === 'all' ? editRoleCompanyId : companyId, editRoleValue, editAllowedSections);
                                    setEditingUserId(null);
                                  }}
                                  className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingUserId(null)}
                                  className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingUserId(profile.id);
                                  setEditRoleCompanyId(userRole?.companyId || (companyId === 'all' ? companies[0]?.id : companyId));
                                  setEditRoleValue(userRole?.role || 'viewer');
                                  setEditAllowedSections(userRole?.allowedSections || []);
                                }}
                                className="p-1.5 bg-transparent text-zinc-500 border border-[#24272C] rounded hover:text-indigo-400 hover:border-indigo-500/50 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <SettingsIcon className="w-12 h-12 text-zinc-600 mb-4 animate-[spin_10s_linear_infinite]" />
            <h3 className="text-sm font-bold font-mono tracking-tight mb-2">More Settings Coming Soon</h3>
            <p className="text-xs text-zinc-500">
              The comprehensive settings module for company preferences, user management, and integrations is under development.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
