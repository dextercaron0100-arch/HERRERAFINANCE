import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BatchRowResult,
  ColumnMapping,
  EXPECTED_HEADERS,
  IMPORT_CHUNK_SIZE,
  applyRowOverride,
  autoDetectMapping,
  downloadBatchTemplate,
  isLargeBatch,
  parseWorkbookFile,
  validateAllRows,
} from '../lib/batchImport';
import {
  canWriteFinance,
  getCashAccounts,
  getCategories,
  getProfiles,
  getTransactions,
  insertTransaction,
} from '../data/mockDatabase';
import { CashAccount, Company } from '../types';

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  companies: Company[];
  defaultCompanyId?: string;
  onImported: (companyId: string) => void;
}

const PAGE_SIZE = 50;
const BATCH_ACCOUNT_TYPES: CashAccount['accountType'][] = ['Cash on Hand', 'Bank', 'E-Wallet'];

export default function BatchUploadModal({
  isOpen,
  onClose,
  userId,
  companies,
  defaultCompanyId,
  onImported,
}: BatchUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [targetCompanyId, setTargetCompanyId] = useState(defaultCompanyId && defaultCompanyId !== 'all' ? defaultCompanyId : '');
  const [batchYear, setBatchYear] = useState(new Date().getFullYear());
  const [preferredCashAccountIds, setPreferredCashAccountIds] = useState<
    Partial<Record<CashAccount['accountType'], string>>
  >({});

  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [manualMapping, setManualMapping] = useState<Partial<ColumnMapping>>({});
  const [needsManualMapping, setNeedsManualMapping] = useState(false);

  const [results, setResults] = useState<BatchRowResult[]>([]);
  const [page, setPage] = useState(0);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<{ success: number; failed: number; skipped: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectableCompanies = companies.filter((c) => c.id !== 'all' && canWriteFinance(userId, c.id));
  const selectableCompanyIds = selectableCompanies.map((company) => company.id).join('|');

  useEffect(() => {
    if (!isOpen) return;
    const requestedCompanyId =
      defaultCompanyId &&
      defaultCompanyId !== 'all' &&
      selectableCompanies.some((company) => company.id === defaultCompanyId)
        ? defaultCompanyId
        : '';
    setTargetCompanyId(
      requestedCompanyId || (selectableCompanies.length === 1 ? selectableCompanies[0].id : ''),
    );
  }, [isOpen, defaultCompanyId, selectableCompanyIds]);

  const categories = useMemo(
    () => (targetCompanyId ? getCategories(targetCompanyId) : []),
    [targetCompanyId],
  );
  const cashAccounts = useMemo(
    () => (targetCompanyId ? getCashAccounts(targetCompanyId) : []),
    [targetCompanyId],
  );
  const ambiguousAccountGroups = useMemo(
    () =>
      BATCH_ACCOUNT_TYPES.map((accountType) => ({
        accountType,
        accounts: cashAccounts.filter((account) => account.isActive && account.accountType === accountType),
      })).filter((group) => group.accounts.length > 1),
    [cashAccounts],
  );

  useEffect(() => {
    setPreferredCashAccountIds({});
  }, [targetCompanyId]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    if (importing) return;
    setStep(1);
    setTargetCompanyId('');
    setPreferredCashAccountIds({});
    setParsedHeaders([]);
    setParsedRows([]);
    setManualMapping({});
    setNeedsManualMapping(false);
    setResults([]);
    setPage(0);
    setImporting(false);
    setProgress({ done: 0, total: 0 });
    setSummary(null);
    onClose();
  };

  const buildContext = () => ({
    categories,
    cashAccounts,
    existingTransactions: getTransactions(userId, targetCompanyId),
    defaultYear: batchYear,
    preferredCashAccountIds,
  });

  const handleContinueFromStep1 = () => {
    if (!targetCompanyId) {
      toast.error('Please select a company for this batch.');
      return;
    }
    if (!canWriteFinance(userId, targetCompanyId)) {
      toast.error("You don't have permission to encode transactions for this company.");
      return;
    }
    const unresolvedAccountType = ambiguousAccountGroups.find(
      ({ accountType }) => !preferredCashAccountIds[accountType],
    );
    if (unresolvedAccountType) {
      toast.error(`Please choose the default ${unresolvedAccountType.accountType} account for this batch.`);
      return;
    }
    setStep(2);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const { headers, rows } = parseWorkbookFile(buffer);

      if (rows.length === 0) {
        toast.error('No data rows found in this file.');
        return;
      }

      setParsedHeaders(headers);
      setParsedRows(rows);

      if (isLargeBatch(rows.length)) {
        toast.warning(`This file has ${rows.length} rows. Consider splitting large batches for easier review.`);
      }

      const autoMapping = autoDetectMapping(headers);
      if (autoMapping) {
        const validated = validateAllRows(rows, autoMapping, buildContext());
        setResults(validated);
        setPage(0);
        setStep(3);
      } else {
        setManualMapping({});
        setNeedsManualMapping(true);
      }
    } catch (err: any) {
      toast.error('Failed to read file: ' + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmManualMapping = () => {
    const missing = EXPECTED_HEADERS.filter((h) => manualMapping[h] === undefined);
    if (missing.length > 0) {
      toast.error(`Please map all columns. Missing: ${missing.join(', ')}`);
      return;
    }
    const validated = validateAllRows(parsedRows, manualMapping as ColumnMapping, buildContext());
    setResults(validated);
    setPage(0);
    setNeedsManualMapping(false);
    setStep(3);
  };

  const updateRow = (rowIndex: number, patch: Parameters<typeof applyRowOverride>[1]) => {
    setResults((prev) => {
      const ctx = buildContext();
      const target = prev.find((r) => r.rowIndex === rowIndex);
      if (!target) return prev;
      const updatedRow = applyRowOverride(target, patch, ctx, prev.filter((r) => r.rowIndex !== rowIndex));
      return prev.map((r) => (r.rowIndex === rowIndex ? updatedRow : r));
    });
  };

  const toggleInclude = (rowIndex: number) => {
    setResults((prev) =>
      prev.map((r) => (r.rowIndex === rowIndex && r.status !== 'error' ? { ...r, include: !r.include } : r)),
    );
  };

  const readyCount = results.filter((r) => r.status === 'ready').length;
  const warningCount = results.filter((r) => r.status === 'warning').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const includedRows = results.filter((r) => r.include);
  const includedTotal = includedRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const categorySummary = Array.from(
    includedRows.reduce((summaryByCategory, row) => {
      const key = row.categoryId || row.categoryName || 'Uncategorized';
      const current = summaryByCategory.get(key) || {
        name: row.categoryName || 'Uncategorized',
        count: 0,
        total: 0,
      };
      current.count += 1;
      current.total += row.amount || 0;
      summaryByCategory.set(key, current);
      return summaryByCategory;
    }, new Map<string, { name: string; count: number; total: number }>()),
  )
    .map(([key, value]) => ({ ...value, key }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pageRows = results.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const formatPeso = (n: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

  const runImport = async () => {
    if (includedRows.length === 0) {
      toast.error('No rows selected to import.');
      return;
    }

    setImporting(true);
    setProgress({ done: 0, total: includedRows.length });

    const profiles = getProfiles();
    const responsiblePerson = profiles.find((p) => p.id === userId)?.email || 'Batch Upload';

    let success = 0;
    let failed = 0;

    for (let i = 0; i < includedRows.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = includedRows.slice(i, i + IMPORT_CHUNK_SIZE);
      chunk.forEach((row) => {
        try {
          const { error } = insertTransaction(userId, {
            companyId: targetCompanyId,
            txnDate: row.txnDate as string,
            type: row.type!,
            amount: row.amount as number,
            categoryId: row.categoryId as string,
            cashAccountId: row.cashAccountId as string,
            purpose: row.purpose,
            remarks: row.remarks || null,
            tags: row.tags,
            paymentMethod: row.paymentMethodRaw,
            responsiblePerson,
            reversalOf: null,
            receiptPath: null,
          });
          if (error) failed++;
          else success++;
        } catch {
          failed++;
        }
      });
      setProgress({ done: Math.min(i + IMPORT_CHUNK_SIZE, includedRows.length), total: includedRows.length });
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    setImporting(false);
    setSummary({ success, failed, skipped: results.length - includedRows.length });
    window.dispatchEvent(new Event('db-update'));
    if (success > 0) {
      toast.success(`${success} transactions sent to the Approval Queue.`, {
        description:
          failed > 0
            ? `${failed} failed and ${results.length - includedRows.length} were skipped.`
            : `${results.length - includedRows.length} rows were skipped.`,
      });
      onImported(targetCompanyId);
    } else {
      toast.error('No transactions were imported. Review the failed rows and try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col"
      >
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 uppercase tracking-widest font-mono text-sm">Batch Upload</h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Step {step} of 4</p>
          </div>
          <button
            onClick={resetAndClose}
            disabled={importing}
            className="text-slate-500 hover:text-slate-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close batch upload"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto grow">
          {step === 1 && (
            <div className="space-y-5 max-w-md">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Target Company
                </label>
                <select
                  value={targetCompanyId}
                  onChange={(e) => setTargetCompanyId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#00B67A] rounded-xl font-mono cursor-pointer"
                >
                  <option value="">-- Select Company --</option>
                  {selectableCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  All rows in this batch will be encoded under one company.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Year (your file's dates like "7/30" have no year)
                </label>
                <input
                  type="number"
                  value={batchYear}
                  onChange={(e) => setBatchYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#00B67A] rounded-xl font-mono"
                />
              </div>

              {ambiguousAccountGroups.map(({ accountType, accounts }) => (
                <div key={accountType}>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Default {accountType} Account
                  </label>
                  <select
                    value={preferredCashAccountIds[accountType] || ''}
                    onChange={(event) =>
                      setPreferredCashAccountIds((current) => ({
                        ...current,
                        [accountType]: event.target.value || undefined,
                      }))
                    }
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#00B67A] rounded-xl font-mono cursor-pointer"
                  >
                    <option value="">-- Select {accountType} Account --</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.bankName} — {account.accountName}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Used for every {accountType} row in this batch. Individual rows can still be changed in preview.
                  </p>
                </div>
              ))}

              <button
                onClick={downloadBatchTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-sky-600 uppercase tracking-wider hover:bg-sky-50 rounded-xl transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Template
              </button>
            </div>
          )}

          {step === 2 && !needsManualMapping && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <UploadCloud className="w-10 h-10 text-slate-300" />
              <p className="text-xs text-slate-600 font-mono text-center max-w-sm">
                Upload the filled-out batch upload Excel file. We'll auto-detect the columns and validate every row
                before anything is saved.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00B67A] hover:bg-[#009E6B] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition cursor-pointer shadow-md"
              >
                <UploadCloud className="w-4 h-4" />
                Choose File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
            </div>
          )}

          {step === 2 && needsManualMapping && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 font-mono">
                We couldn't auto-match your column headers. Map each required field to a column from your file.
              </p>
              {EXPECTED_HEADERS.map((field) => (
                <div key={field} className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    {field}
                  </label>
                  <select
                    value={manualMapping[field] ?? ''}
                    onChange={(e) =>
                      setManualMapping({ ...manualMapping, [field]: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#00B67A] rounded-xl font-mono cursor-pointer"
                  >
                    <option value="">-- Select Column --</option>
                    {parsedHeaders.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h || `Column ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-wider">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> {readyCount} Ready
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3 h-3" /> {warningCount} Possible Duplicate
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  <XCircle className="w-3 h-3" /> {errorCount} Needs Fix
                </span>
                <span className="ml-auto text-slate-500">
                  {includedRows.length} rows selected · {formatPeso(includedTotal)}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full min-w-[1320px] text-[11px] font-mono">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-2 text-center">Include</th>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Purpose/Payee</th>
                      <th className="p-2 text-left">Tags</th>
                      <th className="p-2 text-left">Remarks</th>
                      <th className="p-2 text-left">Category</th>
                      <th className="p-2 text-left">Account</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={
                          row.status === 'error'
                            ? 'bg-rose-50/40'
                            : row.status === 'warning'
                            ? 'bg-amber-50/40'
                            : ''
                        }
                      >
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.include}
                            disabled={row.status === 'error'}
                            onChange={() => toggleInclude(row.rowIndex)}
                            className="cursor-pointer disabled:opacity-30"
                          />
                        </td>
                        <td className="p-2 text-slate-500">{row.rowIndex}</td>
                        <td className="p-2">
                          <input
                            value={row.raw.DATE}
                            onChange={(event) => updateRow(row.rowIndex, { dateRaw: event.target.value })}
                            className={`w-28 px-1.5 py-1 rounded-lg border bg-white font-mono ${
                              row.txnDate ? 'border-slate-200' : 'border-rose-300 bg-rose-50'
                            }`}
                            aria-label={`Date for row ${row.rowIndex}`}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={row.purpose}
                            onChange={(event) => updateRow(row.rowIndex, { purpose: event.target.value })}
                            className={`w-56 px-1.5 py-1 rounded-lg border bg-white font-mono ${
                              row.purpose ? 'border-slate-200' : 'border-rose-300 bg-rose-50'
                            }`}
                            aria-label={`Purpose or payee for row ${row.rowIndex}`}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={row.raw.TAGS}
                            onChange={(event) => updateRow(row.rowIndex, { tagsRaw: event.target.value })}
                            className="w-28 px-1.5 py-1 rounded-lg border border-slate-200 bg-white font-mono"
                            aria-label={`Tags for row ${row.rowIndex}`}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={row.remarks}
                            onChange={(event) => updateRow(row.rowIndex, { remarks: event.target.value })}
                            className="w-36 px-1.5 py-1 rounded-lg border border-slate-200 bg-white font-mono"
                            aria-label={`Remarks for row ${row.rowIndex}`}
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.categoryId || ''}
                            onChange={(e) => {
                              const cat = categories.find((c) => c.id === e.target.value);
                              updateRow(row.rowIndex, {
                                categoryId: cat?.id || null,
                                categoryName: cat?.name || row.categoryName,
                                type: cat?.type ?? null,
                              });
                            }}
                            className={`px-1.5 py-1 rounded-lg border text-[11px] font-mono cursor-pointer ${
                              row.categoryId ? 'border-slate-200 bg-white' : 'border-rose-300 bg-rose-50'
                            }`}
                          >
                            <option value="">-- {row.categoryName || 'unmatched'} --</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.type === 'cash_in' ? 'IN' : 'OUT'})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.cashAccountId || ''}
                            onChange={(e) => updateRow(row.rowIndex, { cashAccountId: e.target.value || null })}
                            className={`px-1.5 py-1 rounded-lg border text-[11px] font-mono cursor-pointer ${
                              row.cashAccountId ? 'border-slate-200 bg-white' : 'border-rose-300 bg-rose-50'
                            }`}
                          >
                            <option value="">-- {row.paymentMethodRaw || 'unmatched'} --</option>
                            {cashAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.accountName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-right">
                          <input
                            value={row.raw.AMOUNT}
                            onChange={(event) => updateRow(row.rowIndex, { amountRaw: event.target.value })}
                            className={`w-28 px-1.5 py-1 rounded-lg border bg-white text-right font-mono ${
                              row.amount !== null && row.amount > 0
                                ? 'border-slate-200'
                                : 'border-rose-300 bg-rose-50'
                            }`}
                            aria-label={`Amount for row ${row.rowIndex}`}
                          />
                        </td>
                        <td className="p-2 max-w-[220px]">
                          {row.status === 'ready' && <span className="text-emerald-600">Ready</span>}
                          {row.status === 'warning' && (
                            <span className="text-amber-600" title={row.duplicateReason}>
                              {row.duplicateReason}
                            </span>
                          )}
                          {row.status === 'error' && (
                            <span className="text-rose-600">{row.errors.join('; ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pageCount > 1 && (
                <div className="flex items-center justify-center gap-3 text-xs font-mono text-slate-600">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>
                    Page {page + 1} of {pageCount}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={page >= pageCount - 1}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 4 && !summary && (
            <div className="space-y-5 max-w-md">
              <p className="text-xs text-slate-600 font-mono">
                You're about to encode <strong>{includedRows.length}</strong> transactions totaling{' '}
                <strong>{formatPeso(includedTotal)}</strong> under{' '}
                <strong>{selectableCompanies.find((c) => c.id === targetCompanyId)?.name}</strong>. They'll enter
                the Approval Queue as pending, same as manual encoding — receipts can be attached later from
                Approvals or Transaction History.
              </p>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Import Summary by Category
                </div>
                <div className="divide-y divide-slate-100">
                  {categorySummary.map((category) => (
                    <div
                      key={category.key}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 text-[11px] font-mono"
                    >
                      <span className="truncate text-slate-700">{category.name}</span>
                      <span className="text-slate-500">
                        {category.count} {category.count === 1 ? 'row' : 'rows'}
                      </span>
                      <span className="text-right font-semibold text-slate-900">
                        {formatPeso(category.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {importing && (
                <div className="space-y-2">
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-[#00B67A] h-2 rounded-full transition-all"
                      style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 text-center">
                    Importing {progress.done} / {progress.total}...
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 4 && summary && (
            <div className="space-y-4 max-w-md">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold font-mono uppercase tracking-wider text-sm">Import Complete</span>
              </div>
              <div className="text-xs font-mono space-y-1 text-slate-700">
                <p>{summary.success} transactions encoded and sent to Approval Queue.</p>
                {summary.failed > 0 && <p className="text-rose-600">{summary.failed} failed to save.</p>}
                {summary.skipped > 0 && <p className="text-slate-500">{summary.skipped} rows skipped (unchecked).</p>}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          {step === 1 && (
            <>
              <span />
              <button
                onClick={handleContinueFromStep1}
                className="px-4 py-2 text-xs font-bold text-white bg-[#00B67A] hover:bg-[#009E6B] uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
              >
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Back
              </button>
              {needsManualMapping && (
                <button
                  onClick={handleConfirmManualMapping}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#00B67A] hover:bg-[#009E6B] uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
                >
                  Preview Rows
                </button>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={includedRows.length === 0}
                className="px-4 py-2 text-xs font-bold text-white bg-[#00B67A] hover:bg-[#009E6B] uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue with {includedRows.length} rows
              </button>
            </>
          )}

          {step === 4 && !summary && (
            <>
              <button
                onClick={() => setStep(3)}
                disabled={importing}
                className="px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={runImport}
                disabled={importing}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#00B67A] hover:bg-[#009E6B] uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer disabled:opacity-60"
              >
                {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Import
              </button>
            </>
          )}

          {step === 4 && summary && (
            <>
              <span />
              <button
                onClick={resetAndClose}
                className="px-4 py-2 text-xs font-bold text-white bg-[#00B67A] hover:bg-[#009E6B] uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
              >
                Done
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
