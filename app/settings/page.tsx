'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabase';

const CAMPUSES = ['UJ APK','UJ APB','UJ SWC','UJ DFC'];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [campus,  setCampus]  = useState('UJ APK');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data:{ user } }) => {
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) { setProfile(data); setCampus(data.campus_preference || 'UJ APK'); }
    });
  }, [router]);

  const save = async () => {
    setSaving(true);
    await supabase.from('users').update({ campus_preference: campus }).eq('id', profile.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!profile) return (
    <div className="min-h-screen bg-bg0"><Navbar/>
      <div className="pt-20 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-border border-t-blue animate-spin"/></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg0">
      <Navbar/>
      <div className="pt-16">
        <div className="bg-bg1 border-b border-border px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-t0">⚙️ Settings</h1>
            <p className="text-t2 text-sm mt-1">Manage your account preferences</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          {/* Profile */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-t1 uppercase tracking-wide mb-4">Profile</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue/20 border-2 border-blue/30 flex items-center justify-center text-2xl font-bold text-blight">
                {profile.email?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-t0">{profile.email?.split('@')[0]}</div>
                <div className="text-sm text-t2">{profile.email}</div>
                <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full border ${profile.role==='admin'?'bg-purple-500/20 text-purple-300 border-purple-500/30':'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                  {profile.role==='admin'?'⚙️ Admin':'🎓 Student'}
                </span>
              </div>
            </div>
          </div>

          {/* Campus */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-t1 uppercase tracking-wide mb-4">Campus Preference</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {CAMPUSES.map(c => (
                <button key={c} onClick={() => setCampus(c)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${campus===c?'bg-blue/20 border-blue text-blight':'border-border text-t1 hover:text-t0'}`}>
                  {c}
                </button>
              ))}
            </div>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-blue hover:bg-blue/90 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all">
              {saving?'Saving...':saved?'✓ Saved!':'Save Changes'}
            </button>
          </div>

          {/* About */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-t1 uppercase tracking-wide mb-4">About</h2>
            <div className="space-y-2 text-sm text-t2">
              <div className="flex justify-between"><span>Version</span><span className="text-t0">1.0.0</span></div>
              <div className="flex justify-between"><span>Standard</span><span className="text-t0">SANS 241:2015</span></div>
              <div className="flex justify-between"><span>Institution</span><span className="text-t0">University of Johannesburg</span></div>
            </div>
          </div>

          {/* Sign out */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-t1 uppercase tracking-wide mb-4">Account</h2>
            <button onClick={signOut}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all">
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
