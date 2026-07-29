import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, TerminalSquare } from 'lucide-react';
import { answerFinanceQuestion } from '../lib/financeBot';
import type { FinanceBotContext, FinanceBotEvidence } from '../lib/financeBot';

interface FinancialAssistantProps {
  userId: string;
  companyId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  evidence?: FinanceBotEvidence;
}

const SUGGESTED_QUESTIONS = [
  "Summarize this month",
  "What is our cash balance?",
  "Which approvals are pending?",
  "What should we collect first?",
] as const;

export default function FinancialAssistant({ userId, companyId }: FinancialAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your built-in Herrera Finance Bot. I can check cash, approvals, AP/AR, receipts, budgets, expenses, recent transactions, and finance risks without sending your question to an external AI service. Type “help” to see examples.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationContextRef = useRef<FinanceBotContext>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    conversationContextRef.current = {};
  }, [userId, companyId]);

  const handleSend = async (e?: React.FormEvent, presetQuestion?: string) => {
    e?.preventDefault();
    const question = presetQuestion || input;
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
       const reply = await answerFinanceQuestion({
         userId,
         companyId,
         question: userMessage.content,
         context: conversationContextRef.current,
       });
       conversationContextRef.current = reply.context;
       
       const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply.content,
          timestamp: new Date(),
          evidence: reply.evidence,
       };

       setMessages(prev => [...prev, assistantMessage]);
    } catch {
       setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I could not read the finance records for that request. Please refresh the dashboard and try again.',
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
            Herrera Finance Bot
          </h2>
          <p className="text-sm text-slate-600 font-mono mt-1">
            Private, rule-based finance answers from your permitted company records.
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
                 {msg.role === 'assistant' && msg.evidence ? (
                   <details className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-600">
                     <summary className="cursor-pointer select-none font-bold uppercase tracking-wider text-indigo-700">
                       How this was calculated
                     </summary>
                     <div className="mt-2 space-y-1.5 leading-relaxed">
                       <p><span className="font-bold text-slate-700">Scope:</span> {msg.evidence.scope}</p>
                       {msg.evidence.period ? <p><span className="font-bold text-slate-700">Period:</span> {msg.evidence.period}</p> : null}
                       <p><span className="font-bold text-slate-700">Method:</span> {msg.evidence.method}</p>
                       <p><span className="font-bold text-slate-700">Records checked:</span> {msg.evidence.records.join(' • ')}</p>
                       <p><span className="font-bold text-slate-700">Calculated:</span> {msg.evidence.calculatedAt}</p>
                     </div>
                   </details>
                 ) : null}
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
           <div className="mb-3 flex max-w-4xl flex-wrap gap-2 mx-auto">
             {SUGGESTED_QUESTIONS.map((question) => (
               <button
                 key={question}
                 type="button"
                 onClick={() => handleSend(undefined, question)}
                 disabled={isLoading}
                 className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-mono text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
               >
                 {question}
               </button>
             ))}
           </div>
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
                aria-label="Send question"
                className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 text-white rounded-lg transition-colors"
             >
                <Send className="w-4 h-4" />
             </button>
           </form>
           <div className="text-center mt-3 flex items-center justify-center gap-2">
              <span className="text-[10px] text-emerald-700 font-mono font-bold uppercase tracking-widest">
                Runs inside Herrera Finance • No external AI API
              </span>
           </div>
        </div>
      </div>
    </div>
  );
}
