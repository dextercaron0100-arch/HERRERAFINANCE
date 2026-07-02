import React, { useState, useRef, useEffect } from "react";
import { MessageSquarePlus, MessageCircle, X, Check, Trash2 } from "lucide-react";
import { Transaction } from "../types";
import { addTransactionAnnotation, removeTransactionAnnotation, getProfiles } from "../data/mockDatabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface AttachmentViewerProps {
  transaction: Transaction;
  userId: string;
}

export default function AttachmentViewer({ transaction, userId }: AttachmentViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [addingAnnotation, setAddingAnnotation] = useState<{x: number, y: number} | null>(null);
  const [newComment, setNewComment] = useState("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  
  const annotations = transaction.annotations || [];
  const profiles = getProfiles();

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    
    // Get click coordinates relative to the image
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setAddingAnnotation({ x, y });
    setNewComment("");
    setSelectedAnnotationId(null);
  };

  const handleSaveAnnotation = () => {
    if (!addingAnnotation || !newComment.trim()) return;
    
    const { error } = addTransactionAnnotation(userId, transaction.id, {
      x: addingAnnotation.x,
      y: addingAnnotation.y,
      text: newComment.trim()
    });
    
    if (error) {
      toast.error("Failed to add comment", { description: error });
    } else {
      toast.success("Comment added");
      setAddingAnnotation(null);
      setNewComment("");
    }
  };
  
  const handleDeleteAnnotation = (annotationId: string) => {
    const { error } = removeTransactionAnnotation(userId, transaction.id, annotationId);
    if (error) {
      toast.error("Failed to delete comment", { description: error });
    } else {
      toast.success("Comment deleted");
      if (selectedAnnotationId === annotationId) {
        setSelectedAnnotationId(null);
      }
    }
  };

  const getAuthorName = (authorId: string) => {
    return profiles.find(p => p.id === authorId)?.fullName || "Unknown";
  };

  if (!transaction.receiptPath) return null;

  return (
    <div className="mb-6 bg-slate-50 border border-slate-200 p-2 rounded-xl overflow-hidden flex flex-col items-center">
      <div className="flex w-full items-center justify-between px-2 pt-1 mb-2">
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono">
          Attachment Review
        </h4>
        <span className="text-xs text-slate-400">Click image to add comments</span>
      </div>
      
      <div 
        ref={containerRef}
        className="relative w-full bg-slate-200 border border-slate-300 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]"
        style={{ cursor: addingAnnotation ? 'default' : 'crosshair' }}
      >
        <img 
          ref={imgRef}
          src={transaction.receiptPath} 
          alt="Receipt Attachment" 
          className="max-w-full max-h-[600px] object-contain transition-opacity duration-300 select-none"
          style={{ opacity: imageLoaded ? 1 : 0 }}
          onLoad={() => setImageLoaded(true)}
          onClick={handleImageClick}
          draggable={false}
        />
        
        {/* Render existing annotations */}
        {imageLoaded && annotations.map(ann => (
          <div 
            key={ann.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
          >
            <div 
              className="relative group cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAnnotationId(selectedAnnotationId === ann.id ? null : ann.id);
                setAddingAnnotation(null);
              }}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-colors ${selectedAnnotationId === ann.id ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50'}`}>
                <MessageCircle className="w-3.5 h-3.5" />
              </div>
              
              <AnimatePresence>
                {selectedAnnotationId === ann.id && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 p-3 pointer-events-auto"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold text-slate-500">{getAuthorName(ann.authorId)}</span>
                      {ann.authorId === userId && (
                        <button 
                          onClick={() => handleDeleteAnnotation(ann.id)}
                          className="text-rose-400 hover:text-rose-600 p-0.5"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 break-words">{ann.text}</p>
                    <div className="mt-2 text-[9px] text-slate-400 text-right">
                      {new Date(ann.createdAt).toLocaleDateString()} {new Date(ann.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
        
        {/* Render new annotation input popover */}
        {imageLoaded && addingAnnotation && (
          <div 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-50"
            style={{ left: `${addingAnnotation.x}%`, top: `${addingAnnotation.y}%` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
              <MessageSquarePlus className="w-3.5 h-3.5" />
            </div>
            
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 p-2">
              <textarea
                autoFocus
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveAnnotation();
                  }
                  if (e.key === 'Escape') {
                    setAddingAnnotation(null);
                  }
                }}
                placeholder="Add a comment..."
                className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-amber-400 resize-none"
                rows={2}
              />
              <div className="flex justify-end gap-1 mt-2">
                <button 
                  onClick={() => setAddingAnnotation(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleSaveAnnotation}
                  disabled={!newComment.trim()}
                  className="p-1 text-white bg-amber-500 hover:bg-amber-600 rounded disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="w-full flex justify-end mt-2">
         <button
            onClick={() => window.open(transaction.receiptPath!, '_blank')}
            className="text-xs text-sky-600 hover:text-sky-700 font-medium"
         >
           Open full size in new tab
         </button>
      </div>
    </div>
  );
}
