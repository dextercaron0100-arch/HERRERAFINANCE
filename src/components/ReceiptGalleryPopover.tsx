import React, { useState } from "react";
import { FileCheck2, FileText, X } from "lucide-react";
import { Attachment } from "../types";

const openReceipt = (url: string) =>
  window.open(url, "_blank", "noopener,noreferrer");

const TRIGGER_CLASS =
  "inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-sky-700 transition hover:bg-sky-100";

export default function ReceiptGalleryPopover({
  attachments,
  fallbackUrl,
}: {
  attachments: Attachment[];
  fallbackUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (attachments.length <= 1) {
    const url = attachments[0]?.fileUrl || fallbackUrl;
    if (!url) return null;
    return (
      <button
        type="button"
        onClick={() => openReceipt(url)}
        className={TRIGGER_CLASS}
        title="Open uploaded receipt"
      >
        <FileCheck2 className="h-3 w-3" />
        Receipt
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={TRIGGER_CLASS}
        title="Open uploaded receipts"
      >
        <FileCheck2 className="h-3 w-3" />
        Receipts ({attachments.length})
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-700">
                Receipts ({attachments.length})
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close receipts list"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto p-2">
              {attachments.map((a, index) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => openReceipt(a.fileUrl)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{a.fileName || `Receipt ${index + 1}`}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
