'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

function strColor(s: string) {
  const c = ['#1e3a5f','#1a3d2e','#2e1a5a','#3d2e0a','#0a2e3d','#2e0a2e'];
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}

function Avatar({ email, size = 10 }: { email: string; size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: strColor(email), fontSize: size > 8 ? 16 : 12 }}>
      {email[0]?.toUpperCase()}
    </div>
  );
}

export default function MessagesPage() {
  const router  = useRouter();
  const [userId,    setUserId]    = useState('');
  const [convos,    setConvos]    = useState<any[]>([]);
  const [allUsers,  setAllUsers]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<'inbox'|'users'>('inbox');
  const [search,    setSearch]    = useState('');
  const chRef = useRef<any>(null);

  const fetchConvos = useCallback(async (uid: string) => {
    const [{ data: sent }, { data: recv }] = await Promise.all([
      supabase.from('messages').select('*, receiver:receiver_id(id,email)').eq('sender_id', uid).order('created_at', { ascending: false }),
      supabase.from('messages').select('*, sender:sender_id(id,email)').eq('receiver_id', uid).order('created_at', { ascending: false }),
    ]);

    const map = new Map<string, any>();
    (sent || []).forEach((m: any) => {
      const p = m.receiver;
      if (!p) return;
      if (!map.has(p.id) || new Date(m.created_at) > new Date(map.get(p.id).created_at))
        map.set(p.id, { ...m, partner: p, isMine: true });
    });
    (recv || []).forEach((m: any) => {
      const p = m.sender;
      if (!p) return;
      if (!map.has(p.id) || new Date(m.created_at) > new Date(map.get(p.id).created_at))
        map.set(p.id, { ...m, partner: p, isMine: false });
    });

    const { data: unread } = await supabase.from('messages').select('sender_id').eq('receiver_id', uid).eq('read', false);
    const uc: Record<string, number> = {};
    (unread || []).forEach((m: any) => { uc[m.sender_id] = (uc[m.sender_id] || 0) + 1; });

    setConvos(Array.from(map.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(c => ({ ...c, unread: uc[c.partner.id] || 0 })));
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async (uid: string) => {
    const { data } = await supabase.from('users').select('id,email,campus_preference,role').neq('id', uid).order('email');
    setAllUsers(data || []);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
      fetchConvos(user.id);
      fetchUsers(user.id);

      // Realtime new messages
      if (chRef.current) supabase.removeChannel(chRef.current);
      const ch = supabase.channel('web-messages-' + Date.now())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
          () => fetchConvos(user.id))
        .subscribe();
      chRef.current = ch;
    });
    return () => { if (chRef.current) supabase.removeChannel(chRef.current); };
  }, [fetchConvos, fetchUsers, router]);

  const totalUnread = convos.reduce((s, c) => s + c.unread, 0);
  const filteredConvos = convos.filter(c => c.partner?.email?.toLowerCase().includes(search.toLowerCase()));
  const filteredUsers  = allUsers.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()) || u.campus_preference?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-bg0">
      <Navbar />
      <div className="pt-16">
        <div className="bg-bg1 border-b border-border">
          <div className="max-w-3xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-bold text-t0">
              💬 Messages {totalUnread > 0 && <span className="text-lg text-blue ml-1">({totalUnread})</span>}
            </h1>
            <p className="text-t2 text-sm mt-1">Direct messaging between UJ community members</p>

            {/* Search */}
            <div className="flex items-center gap-3 mt-4 bg-bg2 border border-border rounded-xl px-4 py-2.5">
              <span className="text-t2 text-sm">🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={tab === 'inbox' ? 'Search conversations...' : 'Search users...'}
                className="flex-1 bg-transparent text-t0 text-sm placeholder-t2 focus:outline-none"/>
              {search && <button onClick={() => setSearch('')} className="text-t2 hover:text-t0">✕</button>}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 bg-bg2 border border-border rounded-xl p-1 w-fit">
              <button onClick={() => setTab('inbox')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab==='inbox'?'bg-blue text-white shadow':'text-t1 hover:text-t0'}`}>
                📥 Inbox {totalUnread > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab==='inbox'?'bg-white/20':'bg-bg3'}`}>{totalUnread}</span>}
              </button>
              <button onClick={() => setTab('users')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab==='users'?'bg-blue text-white shadow':'text-t1 hover:text-t0'}`}>
                👥 All Users <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab==='users'?'bg-white/20':'bg-bg3'}`}>{allUsers.length}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 rounded-full border-2 border-border border-t-blue animate-spin"/>
            </div>
          ) : tab === 'inbox' ? (
            filteredConvos.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-t2 text-lg mb-2">No conversations yet</p>
                <p className="text-t2 text-sm mb-5">Switch to "All Users" to start a conversation</p>
                <button onClick={() => setTab('users')} className="btn-primary text-sm">Browse Users →</button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConvos.map(c => (
                  <button key={c.partner.id} onClick={() => router.push(`/messages/chat/${c.partner.id}`)}
                    className={`w-full card p-4 flex items-center gap-4 hover:border-blue/40 transition-all text-left ${c.unread > 0 ? 'border-blue/30 bg-blue/5' : ''}`}>
                    <Avatar email={c.partner.email || '?'} size={12}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-t0 text-sm">{c.partner.email?.split('@')[0]}</span>
                        <span className="text-xs text-t2 flex-shrink-0">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className={`text-sm truncate ${c.unread > 0 ? 'text-t0 font-medium' : 'text-t2'}`}>
                        {c.isMine ? 'You: ' : ''}{c.body}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <div className="w-5 h-5 rounded-full bg-blue flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-white">{c.unread}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(u => (
                <button key={u.id} onClick={() => router.push(`/messages/chat/${u.id}`)}
                  className="w-full card p-4 flex items-center gap-4 hover:border-blue/40 transition-all text-left">
                  <Avatar email={u.email || '?'} size={12}/>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-t0 text-sm">{u.email?.split('@')[0]}</div>
                    <div className="text-xs text-t2 mt-0.5">{u.email}</div>
                    <div className="text-xs text-blight mt-1">{u.campus_preference || 'No campus'} · {u.role || 'student'}</div>
                  </div>
                  <span className="text-xl flex-shrink-0">💬</span>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-16"><p className="text-t2">No users found</p></div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
