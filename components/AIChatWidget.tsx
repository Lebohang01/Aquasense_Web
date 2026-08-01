'use client';
// web/components/AIChatWidget.tsx
// Floating AI chat widget — add to any page
import { useState, useRef, useEffect } from 'react';

interface Message { role: 'user' | 'assistant'; content: string; }

const SUGGESTIONS = [
  'Is the water safe to drink at APK today?',
  'What does a high TDS reading mean?',
  'Which campus has the best water quality right now?',
  'Explain the current alerts to me',
  'What is SANS 241:2015?',
];

export default function AIChatWidget() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'Sorry, something went wrong.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Unable to connect to AquaAI right now. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue hover:bg-blue/90 shadow-2xl shadow-blue/40 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
        title="Ask AquaAI"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-bg1 border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '520px' }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-blue/20 to-cyan-500/10 border-b border-border px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue/30 flex items-center justify-center text-lg">🤖</div>
            <div>
              <div className="font-bold text-t0 text-sm">AquaAI Assistant</div>
              <div className="text-[10px] text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                Live data · SANS 241:2015
              </div>
            </div>
            <button onClick={() => setMessages([])} className="ml-auto text-xs text-t2 hover:text-t0 transition-colors">Clear</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue/20 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
                  <div className="bg-bg2 border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-t0 leading-relaxed">
                    Hi! I'm AquaAI 👋 I have access to live water quality data across all UJ campuses. Ask me anything about water safety, readings or alerts!
                  </div>
                </div>
                <div className="space-y-2 pl-9">
                  <p className="text-xs text-t2 font-semibold">Try asking:</p>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="block w-full text-left text-xs bg-bg2 hover:bg-bg3 border border-border hover:border-blue/40 text-t1 hover:text-t0 px-3 py-2 rounded-xl transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${m.role === 'user' ? 'bg-blue/30 text-blight' : 'bg-blue/20'}`}>
                    {m.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user'
                      ? 'bg-blue text-white rounded-tr-sm'
                      : 'bg-bg2 border border-border text-t0 rounded-tl-sm'}`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-blue/20 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
                <div className="bg-bg2 border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about water quality..."
                rows={1}
                className="flex-1 bg-bg2 border border-border rounded-xl px-3 py-2.5 text-t0 text-sm placeholder-t2 focus:outline-none focus:border-blue transition-colors resize-none max-h-24"
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 96) + 'px';
                }}
              />
              <button onClick={() => send(input)} disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-blue hover:bg-blue/90 disabled:opacity-30 flex items-center justify-center text-white font-bold transition-all flex-shrink-0">
                ↑
              </button>
            </div>
            <p className="text-[9px] text-t2 text-center mt-1.5">Powered by Claude AI · Live UJ data</p>
          </div>
        </div>
      )}
    </>
  );
}
