'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function StatPill({ val, label }: { val: number|string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-t0 tracking-tight">{val}</div>
      <div className="text-xs text-t2 mt-1">{label}</div>
    </div>
  );
}

function FeatureCard({ emoji, title, desc }: { emoji:string; title:string; desc:string }) {
  return (
    <div className="card p-6 hover:border-blue/40 transition-all duration-300 group">
      <div className="w-12 h-12 rounded-xl bg-blue/10 border border-blue/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">{emoji}</div>
      <h3 className="text-base font-bold text-t0 mb-2">{title}</h3>
      <p className="text-sm text-t2 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState({ nodes:0, readings:0, alerts:0, campuses:4 });
  const [user,  setUser]  = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data:{ user }}) => setUser(user));
    Promise.all([
      supabase.from('nodes').select('node_id', { count:'exact', head:true }),
      supabase.from('readings').select('id', { count:'exact', head:true }),
      supabase.from('alerts').select('id', { count:'exact', head:true }).is('resolved_at', null),
    ]).then(([nodes, readings, alerts]) => {
      setStats({ nodes:nodes.count||0, readings:readings.count||0, alerts:alerts.count||0, campuses:4 });
    });
  }, []);

  return (
    <div className="min-h-screen bg-bg0">
      {/* Simple top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue/20 border border-blue/30 flex items-center justify-center text-lg">💧</div>
            <div>
              <div className="text-base font-bold text-t0 leading-none">AquaSense UJ</div>
              <div className="text-[10px] text-t2 mt-0.5">SANS 241:2015 Monitor</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="btn-primary text-sm py-2 px-5">Open Dashboard →</Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-t1 hover:text-t0 transition-colors font-medium">Sign In</Link>
                <Link href="/login" className="btn-primary text-sm py-2 px-5">Get Started →</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue/10 border border-blue/25 text-blight text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live monitoring across 4 UJ campuses
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-t0 tracking-tight leading-tight mb-6">
            Smart Water Quality
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue to-cyan-400">
              Monitoring at UJ
            </span>
          </h1>

          <p className="text-lg text-t1 leading-relaxed max-w-2xl mx-auto mb-10">
            Real-time pH, TDS, turbidity and temperature monitoring across University of Johannesburg campuses — benchmarked against <strong className="text-blight">SANS 241:2015</strong>, South Africa's mandatory drinking water standard.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href={user ? '/dashboard' : '/login'}
              className="inline-flex items-center gap-2 bg-blue hover:bg-blue/90 text-white font-bold px-8 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-blue/25 hover:-translate-y-0.5 text-base">
              💧 View Live Dashboard
            </Link>
            <Link href="/map"
              className="inline-flex items-center gap-2 bg-bg2 border border-border hover:border-blue/40 text-t0 font-semibold px-8 py-4 rounded-xl transition-all text-base">
              🗺️ Campus Map
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-2xl mx-auto mt-16">
          <div className="card p-8">
            <div className="grid grid-cols-4 gap-6 divide-x divide-border">
              <StatPill val={stats.nodes}    label="Sensor Nodes"   />
              <StatPill val={stats.readings} label="Total Readings"  />
              <StatPill val={stats.alerts}   label="Active Alerts"  />
              <StatPill val={stats.campuses} label="UJ Campuses"    />
            </div>
          </div>
        </div>
      </section>

      {/* SANS 241 Section */}
      <section className="py-16 px-6 bg-bg1 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-t0 mb-3">SANS 241:2015 Compliance</h2>
            <p className="text-t1">Every reading evaluated against South Africa's mandatory drinking water standard</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon:'⚗️', param:'pH',          range:'5.0 – 9.7',   unit:'',     color:'#3b82f6' },
              { icon:'⚡', param:'TDS',          range:'≤ 1,200',     unit:'mg/L', color:'#f59e0b' },
              { icon:'💡', param:'Turbidity',    range:'≤ 5',         unit:'NTU',  color:'#8b5cf6' },
              { icon:'🌡️', param:'Temperature',  range:'5 – 25',      unit:'°C',   color:'#06b6d4' },
            ].map(p => (
              <div key={p.param} className="card p-5 text-center hover:border-blue/30 transition-colors">
                <div className="text-3xl mb-3">{p.icon}</div>
                <div className="text-sm font-bold text-t0 mb-1">{p.param}</div>
                <div className="text-lg font-extrabold" style={{color:p.color}}>{p.range}</div>
                <div className="text-xs text-t2 mt-1">{p.unit || 'dimensionless'}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-6 bg-bg2 border border-border rounded-xl px-8 py-4">
              <div className="flex items-center gap-2"><span className="text-lg">✅</span><span className="text-sm font-semibold text-green-400">SAFE</span><span className="text-xs text-t2">All within limits</span></div>
              <div className="w-px h-6 bg-border"/>
              <div className="flex items-center gap-2"><span className="text-lg">⚠️</span><span className="text-sm font-semibold text-amber-400">CAUTION</span><span className="text-xs text-t2">Approaching limits</span></div>
              <div className="w-px h-6 bg-border"/>
              <div className="flex items-center gap-2"><span className="text-lg">🚨</span><span className="text-sm font-semibold text-red-400">UNSAFE</span><span className="text-xs text-t2">Exceeds limits</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-t0 mb-3">Everything you need</h2>
            <p className="text-t1">Built for UJ students, facilities teams and administrators</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard emoji="📡" title="Real-time Monitoring" desc="ESP32 sensors post readings every 15 minutes. Live updates via Supabase Realtime WebSocket — no refresh needed." />
            <FeatureCard emoji="🗺️" title="Interactive Campus Map" desc="All 4 UJ campuses — APK, APB, SWC and DFC — pinned with live SANS 241 status colours on an interactive map." />
            <FeatureCard emoji="🔔" title="Instant Alerts" desc="Push notifications sent to campus students within 5 seconds of a CAUTION or UNSAFE reading being detected." />
            <FeatureCard emoji="📊" title="History & Trends" desc="Browse timestamped reading logs with min/max/average stats across any time range from 24 hours to 30 days." />
            <FeatureCard emoji="💬" title="Community Forum" desc="Students share observations, tips and water quality reports. Direct messaging between users." />
            <FeatureCard emoji="⚙️" title="Admin Controls" desc="Full CRUD for nodes, users, campuses and reports. Role-gated admin panel for facilities management." />
          </div>
        </div>
      </section>

      {/* Data flow */}
      <section className="py-16 px-6 bg-bg1 border-y border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-t0 mb-3">End-to-end data flow</h2>
          <p className="text-t1 mb-10">From sensor to student screen in under 5 seconds</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[
              { icon:'🔬', label:'ESP32 Sensor' },
              { icon:'→',  label:'' },
              { icon:'☁️', label:'Supabase' },
              { icon:'→',  label:'' },
              { icon:'⚡', label:'Edge Function' },
              { icon:'→',  label:'' },
              { icon:'📱', label:'Mobile App' },
              { icon:'/',  label:'' },
              { icon:'💻', label:'Web Dashboard' },
            ].map((step, i) => (
              step.label ? (
                <div key={i} className="card px-4 py-3 text-center min-w-[100px]">
                  <div className="text-2xl mb-1">{step.icon}</div>
                  <div className="text-xs text-t2 font-medium">{step.label}</div>
                </div>
              ) : (
                <div key={i} className="text-2xl text-t2 font-bold px-1">{step.icon}</div>
              )
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <div className="text-5xl mb-6">💧</div>
          <h2 className="text-3xl font-bold text-t0 mb-4">Start monitoring now</h2>
          <p className="text-t1 mb-8">Sign in with your UJ account to access live readings, alerts and campus water quality data.</p>
          <Link href={user ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-2 bg-blue hover:bg-blue/90 text-white font-bold px-10 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-blue/25 text-base">
            {user ? '→ Go to Dashboard' : '→ Sign In to Get Started'}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-t2 text-sm">
            <span>💧</span>
            <span>AquaSense UJ · University of Johannesburg · SANS 241:2015</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-t2">
            <Link href="/dashboard" className="hover:text-t0 transition-colors">Dashboard</Link>
            <Link href="/map"       className="hover:text-t0 transition-colors">Map</Link>
            <Link href="/alerts"    className="hover:text-t0 transition-colors">Alerts</Link>
            <Link href="/community" className="hover:text-t0 transition-colors">Community</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
