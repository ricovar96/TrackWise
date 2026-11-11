import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Smile,
  User,
  ShieldCheck,
  ChevronDown,
  RotateCcw,
  Loader2,
  HelpCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isCudWarning?: boolean;
}

const QUICK_QUESTIONS = [
  'Which county has the most food deserts?',
  'How many families lack both grocery stores and cars?',
  'What is a "Blind Spot" neighborhood?',
  'Summarize food access in Orange County',
  'How many stores accept SNAP food benefits?',
];

export const FloatingAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello! I am Tracky, your Food Access Assistant for Central Florida.\n\nI can answer your questions about neighborhood food deserts, county statistics, SNAP stores, church pantries, and mobile food truck routes across our 490 census tracts.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const userText = (textToSend || input).trim();
    if (!userText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      const botReply = data.reply || data.error || 'Sorry, I could not process your request.';

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      const fallbackText = isAbort
        ? 'The assistant took too long to respond. Please try again.'
        : 'Unable to reach the assistant right now. Please try again in a moment.';

      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans pointer-events-auto">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-[#a50f15] hover:bg-[#880d12] text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-red-500/30"
          aria-label="Open Tracky Assistant"
        >
          <div className="relative">
            <Smile className="w-5 h-5 text-amber-300" />
          </div>
          <span className="text-xs font-bold font-serif tracking-tight pr-1">
            Tracky
          </span>
        </button>
      )}

      {/* Floating Chat Modal Box */}
      {isOpen && (
        <div className="w-[380px] sm:w-[420px] h-[540px] max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#a50f15] to-amber-600 flex items-center justify-center text-white shadow-xs">
                <Smile className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-serif text-white">
                  Tracky
                </h3>
                <p className="text-[10px] text-slate-400">
                  Your Central Florida Food Access Guide
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs bg-slate-50/50 dark:bg-slate-950/50"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-[#a50f15] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Smile className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-xl p-3 space-y-1 ${
                    msg.sender === 'user'
                      ? 'bg-[#a50f15] text-white rounded-tr-xs shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-xs shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </div>
                  <div
                    className={`text-[9px] text-right ${
                      msg.sender === 'user' ? 'text-red-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-500">
                <div className="w-6 h-6 rounded-lg bg-[#a50f15] text-white flex items-center justify-center shrink-0">
                  <Smile className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#a50f15]" />
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    Tracky is searching food access data...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Questions Pills */}
          <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 overflow-x-auto shrink-0 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 shrink-0 uppercase tracking-wider pl-1">
              Ask:
            </span>
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="px-2.5 py-1 text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-[#a50f15] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full whitespace-nowrap shrink-0 transition-colors border border-slate-200/80 dark:border-slate-700"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Ask Tracky a question..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#a50f15]"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-2 bg-[#a50f15] hover:bg-[#880d12] disabled:opacity-40 text-white rounded-xl transition-colors shrink-0 shadow-xs"
              aria-label="Send query"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
