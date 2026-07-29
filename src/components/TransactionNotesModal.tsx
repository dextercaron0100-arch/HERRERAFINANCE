/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Trash2 } from "lucide-react";
import { Transaction } from "../types";
import {
  addTransactionNote,
  canCommentOnTransaction,
  getProfiles,
  getUserRole,
  isAccountingUser,
  removeTransactionNote,
} from "../data/mockDatabase";
import { toast } from "sonner";

interface TransactionNotesModalProps {
  transaction: Transaction;
  userId: string;
  onClose: () => void;
}

export default function TransactionNotesModal({
  transaction,
  userId,
  onClose,
}: TransactionNotesModalProps) {
  const [newNote, setNewNote] = useState("");
  const profiles = getProfiles();
  const notes = transaction.notes || [];
  const canReply = canCommentOnTransaction(userId, transaction.companyId);
  const currentUserIsAccounting =
    isAccountingUser(userId) ||
    getUserRole(userId, transaction.companyId) === "finance_officer";

  const getAuthorName = (authorId: string) =>
    profiles.find((p) => p.id === authorId)?.fullName || "Unknown";

  const isAccountingReply = (authorId: string) =>
    isAccountingUser(authorId) ||
    getUserRole(authorId, transaction.companyId) === "finance_officer";

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const { error } = addTransactionNote(userId, transaction.id, newNote.trim());
    if (error) {
      toast.error("Failed to add note", { description: error });
    } else {
      toast.success(currentUserIsAccounting ? "Reply sent" : "Note added");
      setNewNote("");
    }
  };

  const handleDeleteNote = (noteId: string) => {
    const { error } = removeTransactionNote(userId, transaction.id, noteId);
    if (error) {
      toast.error("Failed to delete note", { description: error });
    } else {
      toast.success("Note deleted");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
            aria-label="Close approval notes"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-xl font-bold font-display text-slate-900 mb-1 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Approval Notes & Replies
          </h3>
          <div className="mb-6">
            <p className="truncate text-xs font-mono text-slate-500">
              {transaction.purpose}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Approvers and accounting can discuss this transaction here.
            </p>
          </div>

          <div className="space-y-3 max-h-[320px] overflow-y-auto mb-4 pr-1">
            {notes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 font-mono">
                No approval notes yet.
              </p>
            ) : (
              notes
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime(),
                )
                .map((note) => {
                  const accountingReply = isAccountingReply(note.authorId);
                  const isOwnNote = note.authorId === userId;

                  return (
                    <div
                      key={note.id}
                      className={`rounded-xl border p-3 ${
                        accountingReply
                          ? "ml-8 border-blue-200 bg-blue-50"
                          : "mr-8 border-amber-200 bg-amber-50/60"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              accountingReply
                                ? "text-blue-700"
                                : "text-amber-700"
                            }`}
                          >
                            {getAuthorName(note.authorId)}
                          </span>
                          <span className="ml-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                            {accountingReply
                              ? "Accounting reply"
                              : "Approval note"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-slate-400">
                            {new Date(note.createdAt).toLocaleDateString()}{" "}
                            {new Date(note.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isOwnNote && (
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-rose-400 hover:text-rose-600"
                              title="Delete note"
                              aria-label="Delete your note"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 break-words whitespace-pre-wrap">
                        {note.text}
                      </p>
                    </div>
                  );
                })
            )}
          </div>

          {canReply ? (
            <div className="flex items-start gap-2 pt-4 border-t border-slate-200">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
                placeholder={
                  currentUserIsAccounting
                    ? "Reply to the approval note..."
                    : "Leave a note for accounting..."
                }
                rows={2}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 text-sm text-slate-900 focus:outline-hidden focus:border-amber-500 rounded-xl resize-none font-mono"
                aria-label={
                  currentUserIsAccounting
                    ? "Reply to approval note"
                    : "Leave a note for accounting"
                }
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="p-2.5 text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title={currentUserIsAccounting ? "Send reply" : "Send note"}
                aria-label={currentUserIsAccounting ? "Send reply" : "Send note"}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
              You can view this conversation but cannot reply.
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
