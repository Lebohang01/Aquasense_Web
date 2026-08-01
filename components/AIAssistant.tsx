// components/AIAssistant.tsx
// Floating chat widget for the web dashboard
'use client';
import { useState, useRef, useEffect } from 'react';

interface Message { role: 'user' | 'assistant'; content: string; }

const SUGGESTIONS = [
  'Is the water safe to drink at APK today?',
  'What does a TDS of 1,350 mg/L mean?',
  'Which campus has the best water quality right now?',
  'Explain the current alerts to me',
  'What is SANS 241:2015?',
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-blue/30 border border-blue/40 flex items-center justify-center text-xs flex-shrink-0">💧</div>
      <div className="bg-bg2 border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-t2 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}/>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-blue/20 border border-blue/30 flex items-center justify-center text-sm flex-shrink-0 mb-1">💧</div>
      )}
      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
        ${isUser ? 'bg-blue text-white rounded-br-sm' : 'bg-bg2 border border-border text-t0 rounded-bl-sm'}`}>
        {msg.content}
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const [open,     setOpen]    = useState(false);
  const [messages, setMessages]= useState<Message[]>([{
    role: 'assistant',
    content: "Hi! I'm AquaAI 💧 I have live access to water quality readings across all UJ campuses. Ask me anything — is the water safe, what the readings mean, or which campus has the best quality right now.",
  }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'Something went wrong.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not connect. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue hover:bg-blue/90 shadow-2xl shadow-blue/30 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
        title="Ask AquaAI"
      >
        {open ? '✕' : '💧'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-border"
          style={{ height: '520px' }}>

          {/* Header */}
          <div className="bg-bg1 border-b border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-blue/20 border border-blue/30 flex items-center justify-center text-lg">💧</div>
            <div className="flex-1">
              <div className="font-bold text-t0 text-sm">AquaAI Assistant</div>
              <div className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                Live data · SANS 241:2015
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-t2 hover:text-t0 transition-colors">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg0">
            {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef}/>
          </div>

          {/* Suggestions — show only at start */}
          {messages.length === 1 && !loading && (
            <div className="px-3 py-2 bg-bg0 border-t border-border flex flex-col gap-1.5 flex-shrink-0">
              <p className="text-[10px] text-t2 font-semibold uppercase tracking-wide px-1">Quick questions</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.slice(0, 3).map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-xs bg-blue/10 border border-blue/20 text-blight hover:bg-blue/20 px-2.5 py-1.5 rounded-lg transition-all text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="bg-bg1 border-t border-border px-3 py-3 flex items-center gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about water quality..."
              disabled={loading}
              className="flex-1 bg-bg2 border border-border rounded-xl px-3 py-2 text-sm text-t0 placeholder-t2 focus:outline-none focus:border-blue transition-colors disabled:opacity-50"
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-blue hover:bg-blue/90 disabled:opacity-30 flex items-center justify-center text-white font-bold transition-all">
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
