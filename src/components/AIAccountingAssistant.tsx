import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Sparkles, Send, TerminalSquare } from 'lucide-react';
import { toast } from 'sonner';
import { getTransactions, getPayables, getReceivables } from '../data/mockDatabase';
import { getTodayAccountingSummary } from '../lib/accountingOfficerMetrics';

export default function AIAccountingAssistant({ userId, companyId }: { userId: string, companyId: string }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your AI Accounting Assistant. How can I help you close the books today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, presetMsg?: string) => {
    e?.preventDefault();
    const textToSend = presetMsg || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
       const txns = getTransactions(userId, companyId);
       const payables = getPayables(userId, companyId);
       const receivables = getReceivables(userId, companyId);
       const summary = getTodayAccountingSummary(txns, payables, receivables);

       const payload = {
          userId,
          companyId,
          message: userMsg.content,
          context: {
             summary,
             recentTransactions: txns.slice(0, 50)
          }
       };

       const res = await fetch('/api/financial-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: payload.message, context: payload.context })
       });

       if (!res.ok) {
         throw new Error('Failed to communicate with AI Assistant.');
       }

       const data = await res.json();
       
       setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date()
       }]);
    } catch (err: any) {
       setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Error processing request. Please try again later.',
          timestamp: new Date()
       }]);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#141618] border border-[#24272C] rounded-xl flex flex-col overflow-hidden h-[500px]">
      <div className="p-4 border-b border-[#24272C] bg-[#181A1C] flex items-center justify-between">
        <h3 className="text-white text-sm font-mono uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          AI Accounting Assistant
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-[#24272C] text-indigo-400'}`}>
              {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
            </div>
            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
               <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed font-mono whitespace-pre-wrap ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-[#181A1C] text-zinc-300 border border-[#24272C] rounded-tl-none'}`}>
                  {msg.content}
               </div>
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-[#24272C] text-indigo-400 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 animate-pulse" />
            </div>
            <div className="bg-[#181A1C] border border-[#24272C] rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-1">
              <div className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-[#181A1C] border-t border-[#24272C]">
         <div className="flex flex-wrap gap-2 mb-3">
           <button onClick={() => handleSend(undefined, "Summarize today's encoded transactions")} className="text-[10px] bg-[#24272C] hover:bg-[#2c3035] text-zinc-300 px-2 py-1 rounded font-mono">Summarize today</button>
           <button onClick={() => handleSend(undefined, "Find missing receipts")} className="text-[10px] bg-[#24272C] hover:bg-[#2c3035] text-zinc-300 px-2 py-1 rounded font-mono">Find missing receipts</button>
           <button onClick={() => handleSend(undefined, "Which payables are overdue?")} className="text-[10px] bg-[#24272C] hover:bg-[#2c3035] text-zinc-300 px-2 py-1 rounded font-mono">Overdue payables</button>
         </div>
         <form onSubmit={(e) => handleSend(e)} className="relative flex items-center">
           <TerminalSquare className="absolute left-3 w-4 h-4 text-zinc-500" />
           <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the assistant..."
              className="w-full bg-[#0F1113] border border-[#24272C] rounded-lg pl-9 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
              disabled={isLoading}
           />
           <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded transition-colors"
           >
              <Send className="w-3 h-3" />
           </button>
         </form>
      </div>
    </div>
  );
}
