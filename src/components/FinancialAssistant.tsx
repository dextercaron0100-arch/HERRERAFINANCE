import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, TerminalSquare, Search } from 'lucide-react';
import { getTransactions, getBudgets, getPayables, getReceivables } from '../data/mockDatabase';
import { toast } from 'sonner';

interface FinancialAssistantProps {
  companyId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function FinancialAssistant({ companyId }: FinancialAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello. I am your specialized Herrera Financial Intelligence Assistant. How can I help you analyze your treasury data, budgets, or AP/AR today?',
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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
       // Gather some context data to send to the backend
       // Fetching last 50 transactions to give the assistant context
       // We only pass minimal context to avoid huge payload, but enough for meaningful answers
       const allTxns = getTransactions('u-mark', companyId).slice(0, 100); 
       
       const payload = {
          message: userMessage.content,
          context: {
             companyId,
             recentTransactions: allTxns,
             // Could include budgets, payables etc.
          }
       };

       const res = await fetch('/api/financial-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
       });

       if (!res.ok) {
         const errData = await res.json().catch(() => null);
         throw new Error(errData?.error || 'Failed to communicate with the intelligence API.');
       }

       const data = await res.json();
       
       const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date()
       };

       setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
       toast.error('Assistant Error', { description: err.message });
       setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Error: Could not process the request. Please check your network or try again.',
          timestamp: new Date()
       }]);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2 tracking-tight">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Herrera Financial Intelligence Assistant
          </h2>
          <p className="text-sm text-slate-600 font-mono mt-1">
            Analyze trends, query ledgers, and ask about AP/AR anomalies.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden relative shadow-lg">
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#00B67A] text-white' : 'bg-slate-50 text-indigo-600 border border-slate-200'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                 <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#00B67A] text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none font-mono whitespace-pre-wrap'}`}>
                    {msg.content}
                 </div>
                 <span className="text-[10px] text-slate-500 font-mono mt-1.5 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </span>
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-50 text-indigo-600 border border-slate-200 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
           <form onSubmit={handleSend} className="relative flex items-center max-w-4xl mx-auto">
             <TerminalSquare className="absolute left-4 w-5 h-5 text-slate-500" />
             <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about recent expenses, missing collections, or budget health..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-14 py-3.5 text-sm text-slate-900 focus:outline-hidden focus:border-indigo-500 font-mono transition-colors"
                disabled={isLoading}
             />
             <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 text-slate-900 rounded-lg transition-colors"
             >
                <Send className="w-4 h-4" />
             </button>
           </form>
           <div className="text-center mt-3 flex items-center justify-center gap-2">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Powered by Google Gemini</span>
           </div>
        </div>
      </div>
    </div>
  );
}
