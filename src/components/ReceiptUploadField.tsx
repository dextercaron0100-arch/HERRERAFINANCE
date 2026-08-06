import React, { useState } from "react";
import { FileCheck2, FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import {
  PreparedReceipt,
  RECEIPT_ALLOWED_TYPES,
  RECEIPT_MAX_SIZE_MB,
  prepareReceiptFile,
} from "../lib/imageUtils";

export type { PreparedReceipt };

const FORM_LABEL_CLASS =
  "mb-1 block text-[10px] font-mono font-medium uppercase tracking-widest text-slate-500";

export default function ReceiptUploadField({
  files,
  onFilesChange,
  isSubmitting = false,
  maxFiles = 5,
  label = "Receipt / Supporting Document",
  wrapperClassName = "sm:col-span-2",
}: {
  files: PreparedReceipt[];
  onFilesChange: (files: PreparedReceipt[]) => void;
  isSubmitting?: boolean;
  maxFiles?: number;
  label?: string;
  wrapperClassName?: string;
}) {
  const [isPreparing, setIsPreparing] = useState(false);
  const disabled = isPreparing || isSubmitting || files.length >= maxFiles;

  const handleSelect = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const selected = Array.from(fileList);
    const remainingSlots = maxFiles - files.length;
    if (selected.length > remainingSlots) {
      toast.error(
        remainingSlots > 0
          ? `Only ${remainingSlots} more file${remainingSlots === 1 ? "" : "s"} can be attached (max ${maxFiles}).`
          : `You can attach up to ${maxFiles} files.`,
      );
    }
    const toProcess = selected.slice(0, Math.max(remainingSlots, 0));
    if (toProcess.length === 0) return;

    setIsPreparing(true);
    const prepared: PreparedReceipt[] = [];
    for (const file of toProcess) {
      try {
        prepared.push(await prepareReceiptFile(file));
      } catch (error: any) {
        toast.error(error?.message || `Could not prepare ${file.name}.`);
      }
    }
    setIsPreparing(false);
    if (prepared.length > 0) {
      onFilesChange([...files, ...prepared]);
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className={wrapperClassName}>
      <span className={FORM_LABEL_CLASS}>{label}</span>
      <label
        className={`flex min-h-20 items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-3 transition ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
            : "cursor-pointer border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/40"
        }`}
      >
        <input
          type="file"
          multiple
          accept={RECEIPT_ALLOWED_TYPES.join(",")}
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            handleSelect(event.target.files);
            event.currentTarget.value = "";
          }}
        />
        {isPreparing ? (
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        ) : (
          <UploadCloud className="h-5 w-5 text-slate-500" />
        )}
        <div>
          <p className="text-xs font-semibold text-slate-700">
            {isPreparing
              ? "Preparing receipt..."
              : files.length >= maxFiles
                ? `Maximum of ${maxFiles} files attached`
                : "Upload receipts or invoices"}
          </p>
          <p className="mt-0.5 text-[10px] font-mono text-slate-400">
            JPG, PNG, WEBP, or PDF · max {RECEIPT_MAX_SIZE_MB} MB each · up to {maxFiles} files
          </p>
        </div>
      </label>

      {files.length > 0 && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {files.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                {item.file.type.startsWith("image/") ? (
                  <img
                    src={item.dataUrl}
                    alt={item.file.name}
                    className="h-8 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <FileText className="h-8 w-8 shrink-0 text-emerald-600" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-emerald-800">
                    {item.file.name}
                  </p>
                  <p className="flex items-center gap-1 text-[9px] font-mono text-emerald-600">
                    <FileCheck2 className="h-2.5 w-2.5" />
                    {(item.file.size / 1024).toFixed(1)} KB ready
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(item.id)}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Remove ${item.file.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
