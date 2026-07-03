import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, LayoutPanelLeft, LayoutPanelTop, ArrowUp, ArrowDown, GripVertical, ListOrdered, Users, Shield, Edit2, Check, X, Plus, Trash2, Building2, RefreshCw, AlertTriangle } from 'lucide-react';
import { getProfiles, getRoles, getCompanies, saveProfile, saveRole, deleteRole, isGroupAdmin, resetAllData, emptyDashboardData, emptyDataExceptCashAccounts, saveCompany, deleteCompany } from '../data/mockDatabase';
import { Profile, UserCompanyRole, Company, CompanyRole } from '../types';
import { toast } from "sonner";

interface SettingsProps {
  userId: string;
  companyId: string;
  navOrder: string[];
  setNavOrder: (order: string[]) => void;
}

const NAV_LABELS: Record<string, string> = {
  "dashboard": "Overview Dashboard",
  "accounting_workbench": "Accounting Workbench",
  "ledger": "Transaction",
  "money_flow": "Cash Flow",
  "budgets": "Budget Monitor",
  "approvals": "Approvals Queue",
  "assistant": "Intelligence Assistant",
  "owner_dashboard": "Owner Action Summary",
  "pay_rec": "Corporate AP/AR",
  "payroll": "Wages & Payroll",
  "reports": "Executive Sheets",
  "cash_acc": "Cash & Bank",
  "bank_rec": "Bank Reconciliation",
  "vault": "Document Vault",
  "enterprise": "Enterprise Suite",
  "tax_compliance": "Tax Compliance",
  "audit_log": "Security & Audit",
  "workspace": "Workspace Sync",
  "settings": "Settings"
};

const DASHBOARD_SECTION_LABELS: Record<string, string> = {
  "header": "Performance Overview & Header",
  "executive": "Executive Summary Grids",
  "stats": "Core Treasury Stats",
  "quick_command": "Quick Action Desk",
  "charts": "Visual Charts & Infographics",
  "accounts": "Capital Allocation & Designated Accounts",
  "matrix": "Consolidated Data Matrix"
};

export default function Settings({ userId, companyId, navOrder, setNavOrder }: SettingsProps) {
  const [draggedItemIndex, setDraggedItemIndex] = React.useState<number | null>(null);
  
  const [dashboardSections, setDashboardSections] = useState<string[]>([
    "header", "executive", "stats", "quick_command", "charts", "matrix"
  ]);
  const [draggedSectionIndex, setDraggedSectionIndex] = React.useState<number | null>(null);
  const [isConfirmingEmpty, setIsConfirmingEmpty] = useState(false);
  const [isConfirmingEmptyExceptCash, setIsConfirmingEmptyExceptCash] = useState(false);
  
  const latestNavOrder = useRef<string[]>(navOrder);
  const latestDashboardSections = useRef<string[]>(dashboardSections);

  // Update refs when state/props change
  useEffect(() => {
    latestNavOrder.current = navOrder;
  }, [navOrder]);

  useEffect(() => {
    latestDashboardSections.current = dashboardSections;
  }, [dashboardSections]);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserCompanyRole[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRoleCompanyId, setEditRoleCompanyId] = useState<string>("c-bls");
  const [editRoleValue, setEditRoleValue] = useState<CompanyRole | 'remove'>("viewer");
  const [editAllowedSections, setEditAllowedSections] = useState<string[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: '', email: '' });
  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'layout' | 'companies'>('layout');
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editCompanyData, setEditCompanyData] = useState<Partial<Company>>({});
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<Company>>({ name: '', code: '', color: '#3b82f6' });

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

  useEffect(() => {
    const p = profiles.find(p => p.id === userId);
    if (p?.dashboardSectionsOrder) {
      setDashboardSections(p.dashboardSectionsOrder);
    }
  }, [profiles, userId]);

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

  const handleOrderChange = (newOrder: string[]) => {
    setNavOrder(newOrder);
    const currentProfiles = getProfiles();
    const profile = currentProfiles.find(p => p.id === userId);
    if (profile) {
      saveProfile({ ...profile, dashboardLayout: newOrder });
      refreshData();
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newOrder = [...navOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      handleOrderChange(newOrder);
    } else if (direction === 'down' && index < navOrder.length - 1) {
      const newOrder = [...navOrder];
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
      handleOrderChange(newOrder);
    }
  };

  const handleSectionOrderChange = (newOrder: string[]) => {
    setDashboardSections(newOrder);
    const currentProfiles = getProfiles();
    const profile = currentProfiles.find(p => p.id === userId);
    if (profile) {
      saveProfile({ ...profile, dashboardSectionsOrder: newOrder });
      refreshData();
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newOrder = [...dashboardSections];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      handleSectionOrderChange(newOrder);
    } else if (direction === 'down' && index < dashboardSections.length - 1) {
      const newOrder = [...dashboardSections];
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
      handleSectionOrderChange(newOrder);
    }
  };

  const handleSectionDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSectionIndex(index);
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSectionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedSectionIndex === null || draggedSectionIndex === index) return;
    
    const newOrder = [...dashboardSections];
    const draggedItem = newOrder[draggedSectionIndex];
    newOrder.splice(draggedSectionIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setDashboardSections(newOrder);
    setDraggedSectionIndex(index);
  };

  const handleSectionDragEnd = () => {
    setDraggedSectionIndex(null);
    handleSectionOrderChange(latestDashboardSections.current);
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
    handleOrderChange(latestNavOrder.current);
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 text-slate-900 p-4 md:p-6 lg:p-8 font-sans animate-fadeIn pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3 font-mono uppercase tracking-tight">
          <SettingsIcon className="w-6 h-6 text-indigo-500" />
          Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1 font-mono uppercase tracking-wider">
          Configure platform preferences and system settings
        </p>
      </div>
      
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('layout')}
          className={`px-4 py-2 font-mono text-sm tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === 'layout'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
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
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Permission Management
          </button>
        )}
        {isGroupAdmin(userId) && (
          <button
            onClick={() => setActiveTab('companies')}
            className={`px-4 py-2 font-mono text-sm tracking-wider uppercase transition-colors border-b-2 ${
              activeTab === 'companies'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Companies Management
          </button>
        )}
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-mono text-sm tracking-wider uppercase transition-colors border-b-2 ${
            activeTab === 'general'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          General Configuration
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'layout' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-bold font-mono tracking-tight mb-4 flex items-center gap-2 text-slate-800">
              <LayoutPanelLeft className="w-5 h-5 text-indigo-400" />
              Interface Preferences
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2 font-mono flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-emerald-400" />
                  Sidebar Section Arrangement
                </h3>
                <p className="text-xs text-slate-500 mb-4 font-mono">
                  Customize the vertical order of items in your navigation sidebar.
                </p>

                <div className="space-y-2 bg-white border border-slate-200 rounded-lg p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {navOrder.map((id, index) => (
                    <div 
                      key={id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg group transition-colors ${draggedItemIndex === index ? 'opacity-50 border-indigo-500/50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab active:cursor-grabbing" />
                        <span className="text-xs font-mono text-slate-700">
                          {NAV_LABELS[id] || id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-slate-50 rounded text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === navOrder.length - 1}
                          className="p-1.5 hover:bg-slate-50 rounded text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2 font-mono flex items-center gap-2 mt-8">
                  <ListOrdered className="w-4 h-4 text-indigo-400" />
                  Dashboard Sections Arrangement
                </h3>
                <p className="text-xs text-slate-500 mb-4 font-mono">
                  Customize the vertical order of dashboard widgets in the overview screen.
                </p>

                <div className="space-y-2 bg-white border border-slate-200 rounded-lg p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {dashboardSections.map((id, index) => (
                    <div 
                      key={id} 
                      draggable
                      onDragStart={(e) => handleSectionDragStart(e, index)}
                      onDragOver={(e) => handleSectionDragOver(e, index)}
                      onDragEnd={handleSectionDragEnd}
                      className={`flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg group transition-colors ${draggedSectionIndex === index ? 'opacity-50 border-indigo-500/50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab active:cursor-grabbing" />
                        <span className="text-xs font-mono text-slate-700">
                          {DASHBOARD_SECTION_LABELS[id] || id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveSection(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-slate-50 rounded text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveSection(index, 'down')}
                          disabled={index === dashboardSections.length - 1}
                          className="p-1.5 hover:bg-slate-50 rounded text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
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
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-mono tracking-tight flex items-center gap-2 text-slate-800">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  Access & Permissions
                </h2>
                {userId !== 'u-it' && (
                  <button
                    onClick={() => setIsAddingUser(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 rounded text-xs font-mono transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New User
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-6 font-mono">
                Manage all current accounts, their roles, and company access.
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-xs font-mono text-slate-600">
                      <th className="p-3 font-medium">User Profile</th>
                      <th className="p-3 font-medium">Group Admin</th>
                      <th className="p-3 font-medium">Company Role</th>
                      <th className="p-3 font-medium">Specific Access</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {isAddingUser && (
                      <tr className="border-b border-slate-200/50 bg-slate-50">
                        <td className="p-3">
                          <div className="flex flex-col gap-2">
                            <input 
                              type="text" 
                              placeholder="Full Name" 
                              value={newUser.fullName}
                              onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                              className="bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 w-full"
                            />
                            <input 
                              type="email" 
                              placeholder="Email Address" 
                              value={newUser.email}
                              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                              className="bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 w-full"
                            />
                          </div>
                        </td>
                        <td className="p-3"><span className="text-xs text-slate-500 font-mono">NO (Default)</span></td>
                        <td className="p-3"><span className="text-xs text-slate-500 font-mono">Assign after creation</span></td>
                        <td className="p-3"><span className="text-xs text-slate-500 font-mono">-</span></td>
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
                              className="p-1.5 bg-slate-50 text-slate-600 rounded hover:bg-slate-100 transition-colors"
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
                        <tr key={profile.id} className="border-b border-slate-200/50 hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-500" />
                                {profile.fullName}
                              </span>
                              <span className="text-xs text-slate-500 font-mono">{profile.email}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                if (userId === 'u-it') return;
                                if (profile.id === 'u-it') return;
                                handleUpdateGroupAdmin(profile.id, !profile.isGroupAdmin)
                              }}
                              disabled={userId === 'u-it' || profile.id === 'u-it'}
                              className={`px-3 py-1 text-xs font-mono rounded-full border ${
                                profile.isGroupAdmin
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                  : 'bg-transparent text-slate-500 border-slate-200'
                              } ${
                                (userId === 'u-it' || profile.id === 'u-it') 
                                ? 'opacity-50 cursor-not-allowed' 
                                : (profile.isGroupAdmin ? 'hover:bg-indigo-500/20' : 'hover:text-slate-700')
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
                                    className="bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                                  >
                                    {companies.map(c => (
                                      <option key={c.id} value={c.id}>{c.code}</option>
                                    ))}
                                  </select>
                                )}
                                <select 
                                  value={editRoleValue}
                                  onChange={(e) => setEditRoleValue(e.target.value as CompanyRole | 'remove')}
                                  className="bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
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
                                  userRole ? 'bg-slate-50 text-slate-700' : 'bg-transparent text-zinc-600 border border-slate-200'
                                }`}>
                                  {userRole ? userRole.role : 'No specific access'}
                                </span>
                                {userRole && companyId === 'all' && (
                                  <span className="text-[10px] text-slate-500 bg-slate-50 px-1 rounded border border-slate-200 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {companies.find(c => c.id === userRole.companyId)?.code || userRole.companyId}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto custom-scrollbar p-1 border border-slate-200 rounded bg-slate-50">
                                {Object.entries(NAV_LABELS).map(([key, label]) => (
                                  <label key={key} className="flex items-center gap-2 text-xs font-mono text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
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
                                <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">Check to grant access. Uncheck all for default role access.</span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {userRole?.allowedSections && userRole.allowedSections.length > 0 ? (
                                  userRole.allowedSections.map(section => (
                                    <span key={section} className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50 truncate max-w-[120px]" title={NAV_LABELS[section] || section}>
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
                                  className="p-1.5 bg-slate-50 text-slate-600 rounded hover:bg-slate-100 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  if (userId === 'u-it') return;
                                  if (profile.id === 'u-it') return;
                                  setEditingUserId(profile.id);
                                  setEditRoleCompanyId(userRole?.companyId || (companyId === 'all' ? companies[0]?.id : companyId));
                                  setEditRoleValue(userRole?.role || 'viewer');
                                  setEditAllowedSections(userRole?.allowedSections || []);
                                }}
                                disabled={userId === 'u-it' || profile.id === 'u-it'}
                                className={`p-1.5 bg-transparent border rounded transition-colors ${
                                  (userId === 'u-it' || profile.id === 'u-it')
                                  ? 'opacity-50 cursor-not-allowed border-slate-200 text-zinc-600'
                                  : 'text-slate-500 border-slate-200 hover:text-indigo-400 hover:border-indigo-500/50'
                                }`}
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

        {activeTab === 'companies' && isGroupAdmin(userId) && (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold font-mono tracking-tight flex items-center gap-2 text-slate-800">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Companies Management
              </h2>
              <button 
                onClick={() => setIsAddingCompany(!isAddingCompany)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                {isAddingCompany ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isAddingCompany ? 'Cancel' : 'Add Company'}
              </button>
            </div>

            {isAddingCompany && (
              <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50/50 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block mb-1">Company Name</label>
                  <input
                    type="text"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    className="w-full text-sm border-slate-200 rounded-lg font-mono focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block mb-1">Code</label>
                  <input
                    type="text"
                    value={newCompany.code}
                    onChange={(e) => setNewCompany({ ...newCompany, code: e.target.value })}
                    className="w-full text-sm border-slate-200 rounded-lg font-mono focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. ACME"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block mb-1">Theme Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={newCompany.color || '#3b82f6'}
                      onChange={(e) => setNewCompany({ ...newCompany, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                    />
                    <span className="text-xs font-mono text-slate-500 uppercase">{newCompany.color || '#3b82f6'}</span>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => {
                      if (!newCompany.name || !newCompany.code) return;
                      saveCompany({
                        id: `c-${Date.now()}`,
                        name: newCompany.name,
                        code: newCompany.code,
                        color: newCompany.color,
                        createdAt: new Date().toISOString()
                      });
                      setIsAddingCompany(false);
                      setNewCompany({ name: '', code: '', color: '#3b82f6' });
                      refreshData();
                      toast.success("Company Added");
                    }}
                    disabled={!newCompany.name || !newCompany.code}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold">Company Name</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold">Code</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold">Color</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {editingCompanyId === company.id ? (
                          <input
                            type="text"
                            value={editCompanyData.name}
                            onChange={(e) => setEditCompanyData({ ...editCompanyData, name: e.target.value })}
                            className="w-full text-sm border-slate-200 rounded font-mono px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        ) : (
                          company.name
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {editingCompanyId === company.id ? (
                          <input
                            type="text"
                            value={editCompanyData.code}
                            onChange={(e) => setEditCompanyData({ ...editCompanyData, code: e.target.value })}
                            className="w-24 text-sm border-slate-200 rounded font-mono px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        ) : (
                          company.code
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingCompanyId === company.id ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              value={editCompanyData.color || '#3b82f6'}
                              onChange={(e) => setEditCompanyData({ ...editCompanyData, color: e.target.value })}
                              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: company.color || '#3b82f6' }}></div>
                            <span className="text-xs font-mono text-slate-500 uppercase">{company.color || '#3b82f6'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingCompanyId === company.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                saveCompany({ ...company, ...editCompanyData });
                                setEditingCompanyId(null);
                                refreshData();
                                toast.success("Company Updated");
                              }}
                              className="p-1.5 bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 rounded transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingCompanyId(null)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingCompanyId(company.id);
                                setEditCompanyData(company);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if(confirm(`Are you sure you want to delete ${company.name}?`)) {
                                  deleteCompany(company.id);
                                  refreshData();
                                  toast.success("Company Deleted");
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-bold font-mono tracking-tight mb-6 flex items-center gap-2 text-slate-800">
              <SettingsIcon className="w-5 h-5 text-indigo-400" />
              General Configuration
            </h2>

            <div className="space-y-6">
              <div className="p-5 border border-red-500/20 bg-red-500/5 rounded-xl">
                <h3 className="text-sm font-bold text-red-400 mb-2 font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone
                </h3>
                <p className="text-xs text-slate-600 mb-4 font-mono max-w-xl">
                  Resetting all data will permanently delete all transactions, payables, receivables, users, and settings. This action cannot be undone. It will return the app to its original seeded state.
                </p>

                <div className="flex flex-col gap-4">
                  {/* Empty Dashboard Data */}
                  {isConfirmingEmpty ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          try {
                            await emptyDashboardData(userId);
                            toast.success("Dashboard Emptied Successfully");
                            setTimeout(() => {
                              window.location.href = '/';
                            }, 1000);
                          } catch (e: any) {
                            toast.error("Failed to empty dashboard", { description: e.message });
                          }
                        }}
                        className="text-xs font-mono uppercase font-bold text-slate-900 bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-lg transition-colors"
                      >
                        Confirm Empty Dashboard
                      </button>
                      <button
                        onClick={() => setIsConfirmingEmpty(false)}
                        className="text-xs font-mono uppercase font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingEmpty(true)}
                      className="inline-flex items-center justify-center w-fit gap-2 text-xs font-mono uppercase font-bold text-orange-400 hover:text-slate-900 bg-orange-500/10 hover:bg-orange-500/80 border border-orange-500/20 px-4 py-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Empty Dashboard (Keep Users & Companies)
                    </button>
                  )}

                  {/* Empty Data Except Cash Accounts */}
                  {isConfirmingEmptyExceptCash ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          try {
                            await emptyDataExceptCashAccounts(userId);
                            toast.success("Dashboard Emptied (Kept Cash Accounts) Successfully");
                            setTimeout(() => {
                              window.location.href = '/';
                            }, 1000);
                          } catch (e: any) {
                            toast.error("Failed to empty dashboard", { description: e.message });
                          }
                        }}
                        className="text-xs font-mono uppercase font-bold text-slate-900 bg-orange-500 hover:bg-orange-400 px-4 py-2 rounded-lg transition-colors"
                      >
                        Confirm Delete (Keep Cash Accounts)
                      </button>
                      <button
                        onClick={() => setIsConfirmingEmptyExceptCash(false)}
                        className="text-xs font-mono uppercase font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingEmptyExceptCash(true)}
                      className="inline-flex items-center justify-center w-fit gap-2 text-xs font-mono uppercase font-bold text-orange-400 hover:text-slate-900 bg-orange-500/10 hover:bg-orange-500/80 border border-orange-500/20 px-4 py-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Empty Dashboard (Keep Users, Companies & Cash Accounts)
                    </button>
                  )}

                  {/* Reset All Data */}
                  {isConfirmingReset ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          try {
                            await resetAllData(userId);
                            toast.success("Database Reset Successfully");
                            setTimeout(() => {
                              window.location.href = '/';
                            }, 1000);
                          } catch (e: any) {
                            toast.error("Failed to reset database", { description: e.message });
                          }
                        }}
                        className="text-xs font-mono uppercase font-bold text-slate-900 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors"
                      >
                        Confirm Factory Reset
                      </button>
                      <button
                        onClick={() => setIsConfirmingReset(false)}
                        className="text-xs font-mono uppercase font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingReset(true)}
                      className="inline-flex items-center justify-center w-fit gap-2 text-xs font-mono uppercase font-bold text-red-400 hover:text-slate-900 bg-red-500/10 hover:bg-red-500/80 border border-red-500/20 px-4 py-2 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Factory Reset (Back to Seed)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
