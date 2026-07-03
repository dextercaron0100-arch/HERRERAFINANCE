import React, { useState, useRef, useEffect } from "react";
import { Attachment } from "../types";
import { getAttachments, saveAttachment, getProfiles } from "../data/mockDatabase";
import { toast } from "sonner";
import { FileText, UploadCloud, Search, Eye, Download, Image as ImageIcon, File as FileIcon, X, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

import { compressImage } from '../lib/imageUtils';
import { uploadPrivateDocument } from '../lib/privateDocuments';

interface DocumentVaultProps {
  userId: string;
  companyId: string;
}

export default function DocumentVault({ userId, companyId }: DocumentVaultProps) {
  const [attachments, setAttachments] = useState<Attachment[]>(() => getAttachments(companyId));
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<Attachment | null>(null);
  const [qrFile, setQrFile] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const profiles = getProfiles();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      let finalBase64 = "";
      if (file.type.startsWith('image/')) {
        finalBase64 = await compressImage(file);
      } else {
        finalBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      }

      const privateUrl = await uploadPrivateDocument(finalBase64, companyId, file.name);
      const { error, attachment } = saveAttachment(userId, companyId, {
        fileName: file.name,
        fileType: file.type,
        fileUrl: privateUrl,
        entityType: "other",
        entityId: null
      });

      if (error) {
        toast.error("Local Save Failed", { description: error });
      } else if (attachment) {
        setAttachments(prev => [attachment, ...prev]);
      }
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error("Upload Failed", { description: err.message || "Unknown error" });
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredAttachments = attachments.filter(a => 
    a.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.entityType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-8 h-8 text-indigo-400" />;
    return <FileText className="w-8 h-8 text-sky-400" />;
  };

  const getUserName = (id: string) => {
    return profiles.find(p => p.id === id)?.fullName || id;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            Receipt & Document Vault
          </h2>
          <p className="text-sm text-slate-600 font-mono mt-1">
            Secure centralized storage for bills, receipts, and compliance attachments directly linked to Google Drive.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*,application/pdf"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition disabled:opacity-50"
          >
            {isUploading ? <span className="animate-pulse">Uploading...</span> : <><UploadCloud className="w-4 h-4" /> Upload</>}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xl relative min-h-[500px]">

        <div className="flex items-center gap-4 mb-6">
           <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
             <input
               type="text"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               placeholder="Search files..."
               className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono transition-colors"
             />
           </div>
        </div>

        {filteredAttachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-500 py-20 bg-white border border-slate-200 rounded-2xl border-dashed">
            <FileIcon className="w-12 h-12 mb-4 text-zinc-700" />
            <p className="font-mono text-sm max-w-xs text-center">No documents found. Upload a receipt or bill to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAttachments.map((doc) => (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col group hover:border-[#383C42] transition-colors relative">
                 <div className="bg-slate-50 h-32 rounded-lg flex items-center justify-center mb-4 border border-slate-200 group-hover:border-indigo-500/30 transition-colors overflow-hidden">
                    {doc.fileType.startsWith("image/") ? (
                      <img src={doc.fileUrl} alt={doc.fileName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      getFileIcon(doc.fileType)
                    )}
                 </div>
                 <div className="flex-1 flex flex-col">
                   <h4 className="text-sm font-bold text-slate-900 truncate mb-1" title={doc.fileName}>{doc.fileName}</h4>
                   <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3">
                     {new Date(doc.createdAt).toLocaleDateString()}
                   </p>
                   {doc.entityType !== "other" && (
                     <span className="inline-block px-2 py-1 bg-slate-50 text-slate-600 text-[9px] rounded uppercase font-bold tracking-widest self-start mb-2">
                       Linked: {doc.entityType}
                     </span>
                   )}
                   <p className="text-xs text-slate-600 truncate mt-auto">Uploaded by {getUserName(doc.uploadedBy)}</p>
                 </div>
                 
                 {/* Hover Actions */}
                 <div className="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
                    <button 
                      onClick={() => setSelectedFile(doc)}
                      className="p-2 bg-slate-50 hover:bg-slate-50 hover:text-black text-slate-900 rounded-lg transition"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setQrFile(doc)}
                      className="p-2 bg-slate-50 hover:bg-purple-500 text-slate-900 rounded-lg transition"
                      title="Share QR"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <a 
                      href={doc.fileUrl} 
                      download={doc.fileName}
                      className="p-2 bg-slate-50 hover:bg-indigo-500 text-slate-900 rounded-lg transition"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setSelectedFile(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl z-10"
            >
               <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-0.5">{selectedFile.fileName}</h3>
                    <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
                       {selectedFile.fileType} • {new Date(selectedFile.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50">
                  {selectedFile.fileType.startsWith("image/") ? (
                    <img src={selectedFile.fileUrl} alt={selectedFile.fileName} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
                  ) : (
                    <div className="text-center p-12">
                      <FileIcon className="w-20 h-20 text-zinc-600 mx-auto mb-4" />
                      <p className="text-slate-900 font-bold text-lg mb-2">No Preview Available</p>
                      <p className="text-slate-600 text-sm mb-6 max-w-sm">This file type cannot be previewed directly in the browser.</p>
                      <a 
                        href={selectedFile.fileUrl} 
                        download={selectedFile.fileName}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition"
                      >
                        <Download className="w-4 h-4" /> Download File
                      </a>
                    </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {qrFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setQrFile(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm flex flex-col relative overflow-hidden shadow-2xl z-10"
            >
               <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-purple-400" /> Share via QR
                  </h3>
                  <button onClick={() => setQrFile(null)} className="p-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="p-8 flex flex-col items-center bg-white text-center">
                  <div className="bg-white p-4 rounded-xl shadow-xs border border-zinc-200">
                    <QRCodeSVG 
                      value={`${window.location.origin}/share/${qrFile.id}`} 
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="mt-6 text-sm font-semibold text-zinc-900 truncate w-full max-w-xs">{qrFile.fileName}</p>
                  <p className="mt-1 text-xs text-slate-500 max-w-xs">Scan this QR code to quickly access this encrypted document link.</p>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
