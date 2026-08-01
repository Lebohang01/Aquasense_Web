'use client';
import AlertSummary from '@/components/AlertSummary';
import DailyReport  from '@/components/DailyReport';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';
import { evaluateReading, CAMPUS_LABELS, PARAM_META, type Reading } from '@/lib/sans241';
import { formatDistanceToNow } from 'date-fns';

interface Node {
  node_id: string; campus: string; location_name: string;
  latitude: number; longitude: number; status: string; last_seen: string;
}

function NodeCard({ node }: { node: Node }) {
  const [latest, setLatest] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('readings').select('*').eq('node_id', node.node_id)
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => { setLatest(data); setLoading(false); });
  }, [node.node_id]);

  const ev = latest ? evaluateReading(latest) : null;
  const isOnline = node.status === 'online';

  return (
    <Link href={`/node/${node.node_id}`}>
      <div className="card p-5 hover:border-blue/40 transition-all duration-200 cursor-pointer group h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-t0 leading-tight truncate group-hover:text-blight transition-colors">
              {node.location_name}
            </h3>
            <p className="text-xs text-t2 mt-0.5">{CAMPUS_LABELS[node.campus] || node.campus}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border
              ${isOnline ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-bg3 text-t2 border-border'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-t2'}`}/>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {ev && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ev.badge}`}>
                {ev.emoji} {ev.status}
              </span>
            )}
          </div>
        </div>

        {/* Metrics */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 border-border border-t-blue animate-spin"/>
          </div>
        ) : latest ? (
          <div className="grid grid-cols-4 gap-1 bg-bg3 rounded-lg p-3">
            {Object.entries(PARAM_META).map(([key, meta]) => {
              const val = (latest as any)[key];
              return (
                <div key={key} className="flex flex-col items-center gap-0.5">
                  <span className="text-base">{meta.icon}</span>
                  <span className="text-sm font-bold text-t0">
                    {typeof val === 'number' ? (val > 100 ? Math.round(val) : val.toFixed(1)) : '—'}
                  </span>
                  <span className="text-[9px] text-t2">{meta.unit || meta.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-t2">No readings yet</div>
        )}

        {/* Issues */}
        {ev && ev.issues.length > 0 && (
          <div className="mt-3 text-xs font-medium rounded-lg px-3 py-2" style={{ background: ev.bg, color: ev.color }}>
            {ev.emoji} {ev.issues.join(', ')} out of SANS 241 range
          </div>
        )}

        {/* Last seen */}
        {node.last_seen && (
          <p className="text-[10px] text-t2 mt-2 text-right">
            {formatDistanceToNow(new Date(node.last_seen), { addSuffix: true })}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [nodes,        setNodes]        = useState<Node[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [alertCount,   setAlertCount]   = useState(0);
  const [readingCount, setReadingCount] = useState(0);
  const [campus,       setCampus]       = useState('All');
  const [tick,         setTick]         = useState(0);

  const fetchData = useCallback(async () => {
    const [{ data: nodes }, { count: alerts }, { count: readings }] = await Promise.all([
      supabase.from('nodes').select('*').order('campus').order('location_name'),
      supabase.from('alerts').select('id', { count:'exact', head:true }).is('resolved_at', null),
      supabase.from('readings').select('id', { count:'exact', head:true }),
    ]);
    setNodes(nodes || []);
    setAlertCount(alerts || 0);
    setReadingCount(readings || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data:{ user }}) => {
      if (!user) router.push('/login');
    });
    fetchData();

    const ch = supabase.channel('dashboard-web-' + Date.now())
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'readings' }, () => {
        setTick(t => t + 1);
        setReadingCount(c => c + 1);
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'alerts' }, () => setAlertCount(c => c + 1))
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'nodes' }, () => fetchData())
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [fetchData, router]);

  const campuses  = ['All', ...Array.from(new Set(nodes.map(n => n.campus)))];
  const filtered  = campus === 'All' ? nodes : nodes.filter(n => n.campus === campus);
  const onlineCount = nodes.filter(n => n.status === 'online').length;

  return (
    <div className="min-h-screen bg-bg0">
      <Navbar />
      <div className="pt-16">
        {/* Hero bar */}
        <div className="bg-bg1 border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-t0 flex items-center gap-2">
                  🏠 Dashboard
                  <span className="flex items-center gap-1 text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>LIVE
                  </span>
                </h1>
                <p className="text-t2 text-sm mt-1">Real-time water quality across UJ campuses</p>
              </div>
              <Link href="/alerts" className="flex items-center gap-2 bg-bg2 border border-border hover:border-red-500/40 rounded-xl px-4 py-2.5 transition-all">
                <span className="text-lg">🔔</span>
                <span className="text-sm font-medium text-t1">{alertCount} Active Alert{alertCount !== 1 ? 's' : ''}</span>
                {alertCount > 0 && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"/>}
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mt-5">
              {[
                { label:'Nodes',    val:nodes.length,  color:'text-blight'  },
                { label:'Online',   val:onlineCount,   color:'text-green-400'},
                { label:'Alerts',   val:alertCount,    color:'text-red-400'  },
                { label:'Readings', val:readingCount,  color:'text-purple-400'},
              ].map(s => (
                <div key={s.label} className="bg-bg2 border border-border rounded-xl p-4 text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                  <div className="text-xs text-t2 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <AlertSummary />
            <DailyReport />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* SANS legend + campus filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-4">
              {[['✅','SAFE','text-green-400'],['⚠️','CAUTION','text-amber-400'],['🚨','UNSAFE','text-red-400']].map(([e,l,c]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className="text-sm">{e}</span>
                  <span className={`text-xs font-bold ${c}`}>{l}</span>
                </div>
              ))}
              <span className="text-xs text-t2 border-l border-border pl-4">SANS 241:2015</span>
            </div>

            {/* Campus filter */}
            <div className="flex flex-wrap gap-2">
              {campuses.map(c => (
                <button key={c} onClick={() => setCampus(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${campus===c ? 'bg-blue/20 border-blue text-blight' : 'border-border text-t1 hover:text-t0 hover:border-blue/30'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Node grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-2 border-border border-t-blue animate-spin"/>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">💧</div>
              <p className="text-t2">No nodes on {campus} campus</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(node => <NodeCard key={node.node_id + tick} node={node} />)}
            </div>
          )}

          {/* History shortcut */}
          <Link href="/history" className="mt-6 flex items-center justify-between bg-blue/5 border border-blue/20 hover:border-blue/40 rounded-xl px-5 py-4 transition-all group">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <div className="text-sm font-bold text-t0">Readings History</div>
                <div className="text-xs text-t2 mt-0.5">View timestamped logs, trends and statistics</div>
              </div>
            </div>
            <span className="text-blight text-xl group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
