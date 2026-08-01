// components/AlertSummary.tsx
// Feature 2: Smart Alert Summariser widget
'use client';
import { useEffect, useState } from 'react';

interface SummaryData {
  summary: string;
  alertCount: number;
  severity: 'safe' | 'caution' | 'unsafe';
  byStatus?: { unsafe: number; caution: number };
  byCampus?: Record<string, number>;
}

const SEVERITY_STYLE = {
  safe:    { border:'border-green-500/30',  bg:'bg-green-500/8',  icon:'✅', color:'text-green-400',  label:'All Clear'  },
  caution: { border:'border-amber-500/30',  bg:'bg-amber-500/8',  icon:'⚠️', color:'text-amber-400',  label:'Caution'    },
  unsafe:  { border:'border-red-500/30',    bg:'bg-red-500/8',    icon:'🚨', color:'text-red-400',    label:'Unsafe'     },
};

export default function AlertSummary() {
  const [data,      setData]      = useState<SummaryData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/ai/summarise');
      const json = await res.json();
      setData(json);
      setLastFetch(new Date());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch_(); }, []);

  if (loading) {
    return (
      <div className="card p-4 flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-border border-t-blue animate-spin flex-shrink-0"/>
        <div>
          <div className="text-sm font-semibold text-t0">AquaAI is analysing alerts...</div>
          <div className="text-xs text-t2 mt-0.5">Checking all campus nodes</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const style = SEVERITY_STYLE[data.severity];

  return (
    <div className={`card border ${style.border} overflow-hidden`}>
      {/* Header */}
      <div className={`px-5 py-4 ${style.bg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{style.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-t2 uppercase tracking-wide">AquaAI Alert Summary</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  data.severity === 'safe'   ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  data.severity === 'unsafe' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                              'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>{data.alertCount} alert{data.alertCount !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-sm text-t0 leading-relaxed">{data.summary}</p>
            </div>
          </div>
          <button onClick={fetch_} className="text-t2 hover:text-t0 transition-colors flex-shrink-0 text-lg" title="Refresh">🔄</button>
        </div>
      </div>

      {/* Stats row */}
      {data.alertCount > 0 && (
        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            {data.byStatus && (
              <>
                {data.byStatus.unsafe > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400"/>
                    <span className="text-xs text-red-400 font-semibold">{data.byStatus.unsafe} UNSAFE</span>
                  </div>
                )}
                {data.byStatus.caution > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"/>
                    <span className="text-xs text-amber-400 font-semibold">{data.byStatus.caution} CAUTION</span>
                  </div>
                )}
              </>
            )}
          </div>
          {data.byCampus && Object.keys(data.byCampus).length > 0 && (
            <button onClick={() => setExpanded(!expanded)}
              className="text-xs text-blight hover:text-blue transition-colors font-semibold">
              {expanded ? 'Hide' : 'By campus'} {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      )}

      {/* Campus breakdown */}
      {expanded && data.byCampus && (
        <div className="px-5 pb-4 border-t border-border pt-3 grid grid-cols-2 gap-2">
          {Object.entries(data.byCampus).map(([campus, count]) => (
            <div key={campus} className="flex items-center justify-between bg-bg3 rounded-lg px-3 py-2">
              <span className="text-xs text-t1 font-medium">{campus}</span>
              <span className="text-xs font-bold text-amber-400">{count} alert{count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-2 bg-bg1 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-t2">💧 Powered by AquaAI</span>
        </div>
        {lastFetch && (
          <span className="text-[10px] text-t2">Updated {lastFetch.toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
}
