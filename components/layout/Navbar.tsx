'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV = [
  { href:'/dashboard', label:'Dashboard', emoji:'🏠' },
  { href:'/map',       label:'Map',       emoji:'🗺️' },
  { href:'/alerts',    label:'Alerts',    emoji:'🔔' },
  { href:'/history',   label:'History',   emoji:'📊' },
  { href:'/community', label:'Community', emoji:'💬' },
  { href:'/messages',  label:'Messages',  emoji:'✉️' },
];

export default function Navbar() {
  const path = usePathname();
  const [user,   setUser]   = useState<any>(null);
  const [isAdmin,setIsAdmin]= useState(false);
  const [unread, setUnread] = useState(0);
  const [open,   setOpen]   = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data:{ user } }) => {
      setUser(user);
      if (user) {
        supabase.from('users').select('role').eq('id', user.id).single()
          .then(({ data }) => setIsAdmin(data?.role === 'admin'));
        supabase.from('messages').select('id', { count:'exact', head:true })
          .eq('receiver_id', user.id).eq('read', false)
          .then(({ count }) => setUnread(count || 0));
      }
    });
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue/20 border border-blue/30 flex items-center justify-center text-lg">💧</div>
            <div className="hidden sm:block">
              <div className="text-base font-bold text-t0 tracking-tight">AquaSense UJ</div>
              <div className="text-[10px] text-t2 -mt-0.5">SANS 241:2015 Monitor</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${path.startsWith(n.href)
                    ? 'bg-blue/20 text-blight border border-blue/30'
                    : 'text-t1 hover:text-t0 hover:bg-bg3'}`}
              >
                <span className="text-base">{n.emoji}</span>
                {n.label}
                {n.href === '/community' && unread > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
                )}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${path.startsWith('/admin') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-t1 hover:text-t0 hover:bg-bg3'}`}>
                <span className="text-base">⚙️</span>Admin
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg2 border border-border hover:border-blue/40 transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-blue/30 flex items-center justify-center text-xs font-bold text-blight">
                    {user.email?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm text-t1 max-w-[120px] truncate">{user.email?.split('@')[0]}</span>
                  <span className="text-t2 text-xs">▾</span>
                </button>
                {open && (
                  <div className="absolute right-0 top-12 w-48 bg-bg1 border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <div className="text-xs text-t2">Signed in as</div>
                      <div className="text-sm font-medium text-t0 truncate">{user.email}</div>
                    </div>
                    <Link href="/settings" className="flex items-center gap-2 px-4 py-3 text-sm text-t1 hover:text-t0 hover:bg-bg2 transition-colors" onClick={()=>setOpen(false)}>
                      ⚙️ Settings
                    </Link>
                    <button onClick={signOut} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-primary text-sm py-2 px-4">Sign In</Link>
            )}

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg bg-bg2 border border-border text-t1" onClick={()=>setOpen(!open)}>
              {open ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {open && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            {NAV.map(n => (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${path.startsWith(n.href) ? 'bg-blue/20 text-blight' : 'text-t1 hover:text-t0 hover:bg-bg3'}`}
                onClick={()=>setOpen(false)}
              >
                <span>{n.emoji}</span>{n.label}
              </Link>
            ))}
            {isAdmin && <Link href="/admin" className="flex items-center gap-2 px-4 py-2.5 text-sm text-t1 hover:text-t0 hover:bg-bg3 rounded-lg" onClick={()=>setOpen(false)}>⚙️ Admin</Link>}
            {user && <button onClick={signOut} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg">🚪 Sign Out</button>}
          </div>
        )}
      </div>
    </nav>
  );
}
