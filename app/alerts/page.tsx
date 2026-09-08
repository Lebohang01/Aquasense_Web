'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

const PARAM_LABELS: Record<string,{label:string;unit:string;icon:string}> = {
  ph:          {label:'pH',         unit:'',    icon:'⚗️'},
  tds:         {label:'TDS',        unit:'mg/L',icon:'⚡'},
  turbidity:   {label:'Turbidity',  unit:'NTU', icon:'💡'},
  temperature: {label:'Temperature',unit:'°C',  icon:'🌡️'},
};

const STATUS_STYLE: Record<string,{color:string;bg:string;badge:string;emoji:string}> = {
  UNSAFE:  {color:'#f87171',bg:'rgba(239,68,68,0.12)', badge:'bg-red-500/20 text-red-400 border-red-500/30',  emoji:'🚨'},
  CAUTION: {color:'#fbbf24',bg:'rgba(245,158,11,0.12)',badge:'bg-amber-500/20 text-amber-400 border-amber-500/30',emoji:'⚠️'},
};

const FILTERS = ['all','unsafe','caution','resolved'];

export default function AlertsPage() {
  const router = useRouter();
  const [alerts,    setAlerts]    = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [resolving, setResolving] = useState<string|null>(null);

  const fetchAlerts = useCallback(async () => {
    let q = supabase.from('alerts')
      .select('*, nodes(location_name, campus)')
      .order('created_at', { ascending:false }).limit(100);
    if (filter === 'resolved') q = q.not('resolved_at','is',null);
    else if (filter === 'all') q = q.is('resolved_at', null);
    else q = q.eq('sans_status', filter.toUpperCase()).is('resolved_at', null);
    const { data } = await q;
    setAlerts(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) router.push('/login');
  });

  fetchAlerts();

  const channel = supabase.channel(`alerts-web-${Date.now()}`);

  channel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'alerts' },
      () => fetchAlerts()
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'alerts' },
      () => fetchAlerts()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [fetchAlerts, router]);

  const resolve = async (id: string) => {
    setResolving(id);
    await supabase.from('alerts').update({resolved_at: new Date().toISOString()}).eq('id', id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    setResolving(null);
  };

  const counts = {
    all:      alerts.length,
    unsafe:   alerts.filter(a => a.sans_status === 'UNSAFE').length,
    caution:  alerts.filter(a => a.sans_status === 'CAUTION').length,
    resolved: 0,
  };

  return (
    <div className="min-h-screen bg-bg0">
      <Navbar />
      <div className="pt-16">
        <div className="bg-bg1 border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-bold text-t0">🔔 Alerts</h1>
            <p className="text-t2 text-sm mt-1">SANS 241:2015 threshold violations across all campus nodes</p>
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-bg2 border border-red-500/20 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{alerts.filter(a=>a.sans_status==='UNSAFE').length}</div>
                <div className="text-xs text-t2 mt-1">UNSAFE</div>
              </div>
              <div className="bg-bg2 border border-amber-500/20 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">{alerts.filter(a=>a.sans_status==='CAUTION').length}</div>
                <div className="text-xs text-t2 mt-1">CAUTION</div>
              </div>
              <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-t0">{alerts.length}</div>
                <div className="text-xs text-t2 mt-1">Total Active</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all capitalize
                  ${filter===f ? 'bg-blue/20 border-blue text-blight' : 'border-border text-t1 hover:text-t0 hover:border-blue/30'}`}>
                {f} {counts[f as keyof typeof counts] !== undefined ? `(${counts[f as keyof typeof counts]})` : ''}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 rounded-full border-2 border-border border-t-blue animate-spin"/>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-t0 mb-2">All clear!</h3>
              <p className="text-t2 text-sm">No active alerts. All nodes within SANS 241:2015 limits.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => {
                const ss = STATUS_STYLE[alert.sans_status] || STATUS_STYLE.CAUTION;
                const pm = PARAM_LABELS[alert.parameter] || {label:alert.parameter,unit:'',icon:'📊'};
                return (
                  <div key={alert.id} className="card p-5 hover:border-blue/30 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:ss.bg}}>
                        {pm.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-t0 text-sm">{pm.label} {alert.sans_status === 'UNSAFE' ? 'UNSAFE' : 'Caution'}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ss.badge}`}>
                                {ss.emoji} {alert.sans_status}
                              </span>
                            </div>
                            <p className="text-sm text-t1 mt-1">
                              {pm.label} reading of{' '}
                              <strong style={{color:ss.color}}>
                                {typeof alert.value === 'number' ? alert.value.toFixed(alert.parameter==='ph'?2:1) : alert.value}{pm.unit}
                              </strong>{' '}
                              — SANS 241 limit is <strong className="text-t0">{alert.threshold}{pm.unit}</strong>
                            </p>
                          </div>
                          {!alert.resolved_at && (
                            <button onClick={() => resolve(alert.id)} disabled={resolving === alert.id}
                              className="px-4 py-2 text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/25 rounded-lg hover:bg-green-500/25 transition-all flex-shrink-0 disabled:opacity-50">
                              {resolving === alert.id ? '...' : '✓ Resolve'}
                            </button>
                          )}
                        </div>
                        {alert.nodes && (
                          <div className="flex items-center gap-2 mt-3 bg-bg3 rounded-lg px-3 py-2 w-fit">
                            <span className="text-sm">📍</span>
                            <span className="text-xs text-t1">{alert.nodes.location_name} · {alert.nodes.campus}</span>
                          </div>
                        )}
                        <div className="text-xs text-t2 mt-2">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix:true })}
                          {alert.resolved_at && <span className="ml-2 text-green-400">✓ Resolved {formatDistanceToNow(new Date(alert.resolved_at), { addSuffix:true })}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
