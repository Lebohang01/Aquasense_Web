'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabase';
import { evaluateReading, PARAM_META, type Reading } from '@/lib/sans241';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const RANGES = [{ label:'24h',days:1 },{ label:'7d',days:7 },{ label:'30d',days:30 }];

const LIMITS: Record<string,{min?:number;max:number}> = {
  ph:{ min:5.0, max:9.7 }, tds:{ max:1200 }, turbidity:{ max:5 }, temperature:{ min:5, max:25 },
};

function fmtDate(d: string) {
  const dt = new Date(d);
  if (isToday(dt))     return `Today, ${format(dt,'HH:mm')}`;
  if (isYesterday(dt)) return `Yesterday, ${format(dt,'HH:mm')}`;
  return format(dt,'MMM d, HH:mm');
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg1 border border-border rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-t2 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-bold" style={{color:p.color}}>{p.value?.toFixed(2)}</p>
      ))}
    </div>
  );
};

export default function HistoryPage() {
  const router = useRouter();
  const [readings,     setReadings]     = useState<Reading[]>([]);
  const [nodes,        setNodes]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [metric,       setMetric]       = useState('ph');
  const [range,        setRange]        = useState(7);
  const [selectedNode, setSelectedNode] = useState('all');
  const [stats,        setStats]        = useState<{avg:string;min:string;max:string;count:number}|null>(null);

  const fetchReadings = useCallback(async () => {
    const since = new Date(Date.now() - range * 86400000).toISOString();
    let q = supabase.from('readings')
      .select('*, nodes(node_id,location_name,campus)')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(300);
    if (selectedNode !== 'all') q = q.eq('node_id', selectedNode);
    const { data } = await q;
    setReadings(data || []);

    if (data && data.length > 0) {
      const vals = data.map((r: any) => r[metric]).filter((v: any) => v != null);
      if (vals.length > 0) {
        setStats({
          avg: (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2),
          min: Math.min(...vals).toFixed(2),
          max: Math.max(...vals).toFixed(2),
          count: data.length,
        });
      }
    } else setStats(null);
    setLoading(false);
  }, [range, selectedNode, metric]);

  const fetchNodes = useCallback(async () => {
    const { data } = await supabase.from('nodes').select('node_id,location_name,campus').order('campus');
    setNodes(data || []);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data:{ user }}) => { if (!user) router.push('/login'); });
    fetchNodes();
  }, [fetchNodes, router]);

  useEffect(() => { fetchReadings(); }, [fetchReadings]);

  const activeMetric = PARAM_META[metric];
  const limit = LIMITS[metric];

  // Chart data — chronological, max 100 points
  const chartData = [...readings]
    .reverse()
    .slice(0, 100)
    .map((r: any) => ({
      time: format(new Date(r.created_at), range === 1 ? 'HH:mm' : 'MMM d'),
      value: r[metric],
    }))
    .filter(d => d.value != null);

  return (
    <div className="min-h-screen bg-bg0">
      <Navbar />
      <div className="pt-16">
        {/* Header */}
        <div className="bg-bg1 border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-t0">📊 History</h1>
                <p className="text-t2 text-sm mt-1">Timestamped readings log with trends</p>
              </div>
              {/* Range selector */}
              <div className="flex bg-bg2 border border-border rounded-xl p-1">
                {RANGES.map(r => (
                  <button key={r.label} onClick={() => setRange(r.days)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all
                      ${range===r.days ? 'bg-blue text-white shadow' : 'text-t1 hover:text-t0'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Metric selector */}
            <div className="flex flex-wrap gap-2 mt-5">
              {Object.entries(PARAM_META).map(([key, meta]) => (
                <button key={key} onClick={() => setMetric(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all
                    ${metric===key ? 'text-white border-transparent' : 'border-border text-t1 hover:text-t0'}`}
                  style={metric===key ? {background: meta.color, borderColor: meta.color} : {}}>
                  <span>{meta.icon}</span>{meta.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:`Avg ${activeMetric.label}`, val:`${stats.avg}${activeMetric.unit}`, color: activeMetric.color },
                { label:'Minimum',  val:`${stats.min}${activeMetric.unit}`, color:'#22c55e' },
                { label:'Maximum',  val:`${stats.max}${activeMetric.unit}`, color:'#f59e0b' },
                { label:'Readings', val:stats.count,                        color:'#60a5fa' },
              ].map(s => (
                <div key={s.label} className="card p-4 text-center">
                  <div className="text-2xl font-bold tracking-tight" style={{color:s.color}}>{s.val}</div>
                  <div className="text-xs text-t2 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-t0">
                {activeMetric.icon} {activeMetric.label} — {range===1?'Last 24 hours':`Last ${range} days`}
              </h2>
              <span className="text-xs text-t2 bg-bg3 px-3 py-1 rounded-full">
                SANS 241 safe: {activeMetric.safe}{activeMetric.unit && ` ${activeMetric.unit}`}
              </span>
            </div>

            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{top:5,right:10,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d47" />
                  <XAxis dataKey="time" tick={{fill:'#475569',fontSize:11}} axisLine={{stroke:'#1e2d47'}} tickLine={false} />
                  <YAxis tick={{fill:'#475569',fontSize:11}} axisLine={{stroke:'#1e2d47'}} tickLine={false} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  {/* SANS 241 limit lines */}
                  {limit?.max && <ReferenceLine y={limit.max} stroke="#f59e0b" strokeDasharray="6 3" label={{value:'Max',fill:'#f59e0b',fontSize:10}} />}
                  {limit?.min && <ReferenceLine y={limit.min} stroke="#f59e0b" strokeDasharray="6 3" label={{value:'Min',fill:'#f59e0b',fontSize:10}} />}
                  <Line
                    type="monotone" dataKey="value"
                    stroke={activeMetric.color} strokeWidth={2.5}
                    dot={false} activeDot={{r:4,fill:activeMetric.color}}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-t2 text-sm">
                Not enough data for this period
              </div>
            )}
          </div>

          {/* Node filter */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedNode('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedNode==='all'?'bg-blue/20 border-blue text-blight':'border-border text-t1 hover:text-t0'}`}>
              All Nodes
            </button>
            {nodes.map(n => (
              <button key={n.node_id} onClick={() => setSelectedNode(n.node_id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedNode===n.node_id?'bg-blue/20 border-blue text-blight':'border-border text-t1 hover:text-t0'}`}>
                {n.location_name}
              </button>
            ))}
          </div>

          {/* Readings list */}
          <div>
            <h2 className="text-sm font-bold text-t2 uppercase tracking-widest mb-3">Recent Readings</h2>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 rounded-full border-2 border-border border-t-blue animate-spin"/>
              </div>
            ) : readings.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">📊</div>
                <p className="text-t2">No readings in this period</p>
              </div>
            ) : (
              <div className="space-y-2">
                {readings.map((r: any) => {
                  const ev = evaluateReading(r);
                  return (
                    <div key={r.id} className="card p-4 hover:border-blue/30 transition-all">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="text-sm font-semibold text-t0">{r.nodes?.location_name || 'Unknown'}</div>
                            <div className="text-xs text-t2">{r.nodes?.campus} · {fmtDate(r.created_at)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="grid grid-cols-4 gap-3">
                            {Object.entries(PARAM_META).map(([key, meta]) => {
                              const val = (r as any)[key];
                              return (
                                <div key={key} className="text-center min-w-[50px]">
                                  <div className="text-sm font-bold text-t0">
                                    {typeof val === 'number' ? (val > 100 ? Math.round(val) : val.toFixed(1)) : '—'}
                                  </div>
                                  <div className="text-[9px] text-t2">{meta.unit || meta.label}</div>
                                </div>
                              );
                            })}
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${ev.badge}`}>
                            {ev.emoji} {ev.status}
                          </span>
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
    </div>
  );
}
