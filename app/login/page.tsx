'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const CAMPUSES = ['UJ APK','UJ APB','UJ SWC','UJ DFC'];

export default function LoginPage() {
  const router = useRouter();
  const [mode,     setMode]     = useState<'login'|'signup'>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [campus,   setCampus]   = useState('UJ APK');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await supabase.from('users').upsert({ id:data.user.id, email, campus_preference:campus, role:'student' });
        }
        setError('Account created! Check your email to confirm, then sign in.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg0 flex flex-col items-center justify-center px-4">
      {/* Hero top */}
      <div className="text-center mb-10">
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 rounded-2xl bg-blue/20 border border-blue/30 flex items-center justify-center text-4xl mx-auto shadow-lg shadow-blue/10">💧</div>
          <div className="absolute -inset-3 rounded-3xl border border-blue/10 pulse-ring" />
        </div>
        <h1 className="text-3xl font-extrabold text-t0 tracking-tight">AquaSense UJ</h1>
        <p className="text-t2 text-sm mt-2">SANS 241:2015 Water Quality Monitor</p>
        {/* Status chips */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {['pH','TDS','Turbidity','Temp'].map((l,i) => (
            <span key={l} className="flex items-center gap-1.5 bg-bg2 border border-border text-t2 text-xs px-3 py-1 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${i===0?'bg-red-400':'bg-green-400'}`}/>
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Form card */}
      <div className="w-full max-w-md">
        <div className="card p-8">
          {/* Mode toggle */}
          <div className="flex bg-bg1 rounded-xl p-1 mb-6 border border-border">
            {(['login','signup'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode===m ? 'bg-blue text-white shadow' : 'text-t1 hover:text-t0'}`}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <h2 className="text-xl font-bold text-t0 mb-6">
            {mode === 'login' ? 'Welcome back' : 'Join AquaSense UJ'}
          </h2>

          {error && (
            <div className={`text-sm px-4 py-3 rounded-lg mb-4 border ${error.includes('created') ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-t1 uppercase tracking-wide mb-2">Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="student@uj.ac.za"
                className="w-full bg-bg1 border border-border rounded-xl px-4 py-3 text-t0 text-sm placeholder-t2 focus:outline-none focus:border-blue transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-t1 uppercase tracking-wide mb-2">Password</label>
              <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-bg1 border border-border rounded-xl px-4 py-3 text-t0 text-sm placeholder-t2 focus:outline-none focus:border-blue transition-colors"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-t1 uppercase tracking-wide mb-2">My Campus</label>
                <div className="flex flex-wrap gap-2">
                  {CAMPUSES.map(c => (
                    <button key={c} type="button" onClick={() => setCampus(c)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${campus===c ? 'bg-blue/20 border-blue text-blight' : 'border-border text-t1 hover:text-t0 hover:border-blue/40'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue hover:bg-blue/90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all mt-2 text-sm">
              {loading ? '...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue/5 border border-blue/15 rounded-xl">
            <p className="text-xs text-t2 text-center leading-relaxed">
              Monitoring against <span className="text-blight font-semibold">SANS 241:2015</span> — South Africa's mandatory drinking water standard
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-t2 mt-4">
          <Link href="/" className="hover:text-t0 transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
