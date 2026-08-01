'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabase';
import { format, isToday, isYesterday } from 'date-fns';

function strColor(s: string) {
  const c = ['#1e3a5f','#1a3d2e','#2e1a5a','#3d2e0a','#0a2e3d','#2e0a2e'];
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}

function fmtTime(d: string) {
  const dt = new Date(d);
  if (isToday(dt))     return format(dt, 'HH:mm');
  if (isYesterday(dt)) return `Yesterday ${format(dt, 'HH:mm')}`;
  return format(dt, 'MMM d, HH:mm');
}

function groupByDate(msgs: any[]) {
  const groups: any[] = [];
  let cur = '';
  msgs.forEach(m => {
    const ds = new Date(m.created_at).toDateString();
    if (ds !== cur) {
      cur = ds;
      const dt = new Date(m.created_at);
      groups.push({ type:'date', id:'date-'+ds,
        label: isToday(dt) ? 'Today' : isYesterday(dt) ? 'Yesterday' : format(dt,'MMMM d, yyyy') });
    }
    groups.push({ type:'msg', ...m });
  });
  return groups;
}

export default function ChatPage() {
  const params    = useParams();
  const userId    = params.userId as string;
  const router    = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const chRef     = useRef<any>(null);

  const [myId,     setMyId]    = useState('');
  const [partner,  setPartner] = useState<any>(null);
  const [messages, setMessages]= useState<any[]>([]);
  const [loading,  setLoading] = useState(true);
  const [text,     setText]    = useState('');
  const [sending,  setSending] = useState(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
  }, []);

  const fetchMessages = useCallback(async (uid: string) => {
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${uid})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoading(false);
    await supabase.from('messages').update({ read: true })
      .eq('sender_id', userId).eq('receiver_id', uid).eq('read', false);
  }, [userId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setMyId(user.id);
      fetchMessages(user.id);

      supabase.from('users').select('id,email,campus_preference,role').eq('id', userId).single()
        .then(({ data }) => setPartner(data));

      if (chRef.current) supabase.removeChannel(chRef.current);
      const ch = supabase.channel(`chat-web-${user.id}-${userId}-${Date.now()}`)
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages' },
          async (payload: any) => {
            const m = payload.new;
            const rel = (m.sender_id === user.id && m.receiver_id === userId) ||
                        (m.sender_id === userId && m.receiver_id === user.id);
            if (!rel) return;
            setMessages(prev => {
              if (prev.find((x: any) => x.id === m.id)) return prev;
              return [...prev, m];
            });
            if (m.receiver_id === user.id)
              await supabase.from('messages').update({ read: true }).eq('id', m.id);
          }
        ).subscribe();
      chRef.current = ch;
    });
    return () => { if (chRef.current) supabase.removeChannel(chRef.current); };
  }, [fetchMessages, router, userId]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const send = async () => {
    if (!text.trim() || !myId || sending) return;
    const body = text.trim();
    setText('');
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: myId, receiver_id: userId, body, read: false,
    });
    if (error) setText(body);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const delMsg = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    await supabase.from('messages').delete().eq('id', id);
    setMessages(prev => prev.filter((m: any) => m.id !== id));
  };

  const grouped = groupByDate(messages);

  return (
    <div className="h-screen bg-bg0 flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-col flex-1 pt-16 overflow-hidden">

        {/* Header */}
        <div className="bg-bg1 border-b border-border px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button onClick={() => router.push('/messages')} className="text-blight hover:text-blue text-xl font-bold transition-colors">←</button>
          {partner && (
            <>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                style={{ backgroundColor: strColor(partner.email || '') }}>
                {partner.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-t0 leading-tight">{partner.email?.split('@')[0]}</div>
                <div className="text-xs text-t2">{partner.campus_preference || ''} · {partner.role || 'student'}</div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-green-400 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>Active
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-border border-t-blue animate-spin"/>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              {partner && (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                  style={{ backgroundColor: strColor(partner.email || '') }}>
                  {partner.email?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="text-center">
                <div className="font-bold text-t0 text-lg">{partner?.email?.split('@')[0]}</div>
                <div className="text-t2 text-sm mt-1">{partner?.email}</div>
                <div className="text-t2 text-sm mt-4 max-w-xs leading-relaxed">
                  Start a conversation about water quality at UJ 💧
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-1">
              {grouped.map((item: any) => {
                if (item.type === 'date') return (
                  <div key={item.id} className="flex items-center gap-3 py-4">
                    <div className="flex-1 h-px bg-border"/>
                    <span className="text-xs text-t2 font-semibold">{item.label}</span>
                    <div className="flex-1 h-px bg-border"/>
                  </div>
                );
                const mine = item.sender_id === myId;
                return (
                  <div key={item.id} className={`flex items-end gap-2 group ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!mine && partner && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-5"
                        style={{ backgroundColor: strColor(partner.email || '') }}>
                        {partner.email?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="max-w-[65%]">
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
                        ${mine ? 'bg-blue text-white rounded-br-sm' : 'bg-bg2 border border-border text-t0 rounded-bl-sm'}`}>
                        {item.body}
                      </div>
                      <div className={`flex items-center gap-1.5 mt-1 px-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-t2">{fmtTime(item.created_at)}</span>
                        {mine && (
                          <>
                            <span className={`text-[10px] font-bold ${item.read ? 'text-blight' : 'text-t2'}`}>
                              {item.read ? '✓✓' : '✓'}
                            </span>
                            <button onClick={() => delMsg(item.id)}
                              className="text-[10px] text-t2 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                              🗑
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef}/>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-bg1 px-4 sm:px-8 py-4 flex-shrink-0">
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <div className="flex-1 bg-bg2 border border-border rounded-2xl px-4 py-3 focus-within:border-blue transition-colors">
              <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                onKeyDown={handleKey} rows={1} maxLength={1000}
                placeholder={`Message ${partner?.email?.split('@')[0] || 'user'}...`}
                className="w-full bg-transparent text-t0 text-sm placeholder-t2 focus:outline-none resize-none max-h-32"
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                }}
              />
            </div>
            <button onClick={send} disabled={!text.trim() || sending}
              className="w-11 h-11 rounded-full bg-blue hover:bg-blue/90 disabled:opacity-30 flex items-center justify-center text-white font-bold text-lg transition-all hover:scale-105 active:scale-95 flex-shrink-0">
              {sending
                ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                : <span>↑</span>
              }
            </button>
          </div>
          <p className="text-[10px] text-t2 text-center mt-2 max-w-3xl mx-auto">
            Enter to send · Shift+Enter for new line · Hover message to delete
          </p>
        </div>
      </div>
    </div>
  );
}
