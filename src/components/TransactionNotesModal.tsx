/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Trash2 } from "lucide-react";
import { Transaction } from "../types";
import { addTransactionNote, removeTransactionNote, getProfiles } from "../data/mockDatabase";
import { toast } from "sonner";

interface TransactionNotesModalProps {
  transaction: Transaction;
  userId: string;
  canAdd: boolean;
  onClose: () => void;
}

export default function TransactionNotesModal({
  transaction,
  userId,
  canAdd,
  onClose,
}: TransactionNotesModalProps) {
  const [newNote, setNewNote] = useState("");
  const profiles = getProfiles();
  const notes = transaction.notes || [];

  const getAuthorName = (authorId: string) =>
    profiles.find((p) => p.id === authorId)?.fullName || "Unknown";

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const { error } = addTransactionNote(userId, transaction.id, newNote.trim());
    if (error) {
      toast.error("Failed to add note", { description: error });
    } else {
      toast.success("Note added");
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
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-xl font-bold font-display text-slate-900 mb-1 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Notes
          </h3>
          <p className="text-xs font-mono text-slate-500 mb-6 truncate">
            {transaction.purpose}
          </p>

          <div className="space-y-3 max-h-[320px] overflow-y-auto mb-4 pr-1">
            {notes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 font-mono">
                No notes yet.
              </p>
            ) : (
              notes
                .slice()
                .reverse()
                .map((note) => (
                  <div
                    key={note.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3"
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {getAuthorName(note.authorId)}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] text-slate-400">
                          {new Date(note.createdAt).toLocaleDateString()}{" "}
                          {new Date(note.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {note.authorId === userId && (
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-rose-400 hover:text-rose-600"
                            title="Delete note"
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
                ))
            )}
          </div>

          {canAdd && (
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
                placeholder="Leave a note for accounting..."
                rows={2}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 text-sm text-slate-900 focus:outline-hidden focus:border-amber-500 rounded-xl resize-none font-mono"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="p-2.5 text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Send note"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
