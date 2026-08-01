// components/DailyReport.tsx
// Feature 3: Daily Report widget
'use client';
import { useEffect, useState } from 'react';

interface ReportData {
  report: string;
  date: string;
  stats: {
    totalReadings: number;
    totalAlerts: number;
    campusStats: Record<string, any>;
  };
  overall: 'safe' | 'caution' | 'unsafe';
}

const OVERALL_STYLE = {
  safe:    { bg:'bg-green-500/10', border:'border-green-500/25', icon:'✅', badge:'bg-green-500/20 text-green-400 border-green-500/30' },
  caution: { bg:'bg-amber-500/10', border:'border-amber-500/25', icon:'⚠️', badge:'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  unsafe:  { bg:'bg-red-500/10',   border:'border-red-500/25',   icon:'🚨', badge:'bg-red-500/20 text-red-400 border-red-500/30'       },
};

export default function DailyReport() {
  const [data,    setData]    = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/ai/daily-report');
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch_(); }, []);

  if (loading) {
    return (
      <div className="card p-5 flex items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-blue animate-spin flex-shrink-0"/>
        <div>
          <div className="font-semibold text-t0 text-sm">Generating daily report...</div>
          <div className="text-xs text-t2 mt-1">AquaAI is analysing 24h of data</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const style = OVERALL_STYLE[data.overall];

  return (
    <div className={`card border ${style.border} overflow-hidden`}>
      {/* Header */}
      <div className={`px-5 py-4 ${style.bg} flex items-center justify-between border-b border-border`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{style.icon}</span>
          <div>
            <div className="text-xs font-bold text-t2 uppercase tracking-wide">AquaAI Daily Report</div>
            <div className="text-sm font-bold text-t0">{data.date}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${style.badge}`}>
            {data.overall.toUpperCase()}
          </span>
          <button onClick={fetch_} className="text-t2 hover:text-t0 transition-colors" title="Regenerate">🔄</button>
        </div>
      </div>

      {/* Report text */}
      <div className="px-5 py-4">
        <p className="text-sm text-t0 leading-relaxed whitespace-pre-wrap">{data.report}</p>
      </div>

      {/* Quick stats */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-3">
        <div className="bg-bg3 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-blight">{data.stats.totalReadings}</div>
          <div className="text-[10px] text-t2 mt-1">Readings</div>
        </div>
        <div className="bg-bg3 rounded-xl p-3 text-center">
          <div className={`text-xl font-bold ${data.stats.totalAlerts > 0 ? 'text-amber-400' : 'text-green-400'}`}>
            {data.stats.totalAlerts}
          </div>
          <div className="text-[10px] text-t2 mt-1">Alerts</div>
        </div>
        <div className="bg-bg3 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-purple-400">4</div>
          <div className="text-[10px] text-t2 mt-1">Campuses</div>
        </div>
      </div>

      {/* Campus detail toggle */}
      {data.stats.campusStats && (
        <>
          <div className="px-5 pb-3">
            <button onClick={() => setShowStats(!showStats)}
              className="text-xs text-blight hover:text-blue font-semibold transition-colors">
              {showStats ? '▲ Hide' : '▼ Show'} campus breakdown
            </button>
          </div>

          {showStats && (
            <div className="px-5 pb-4 space-y-2 border-t border-border pt-3">
              {Object.entries(data.stats.campusStats).map(([campus, stats]: [string, any]) => (
                <div key={campus} className="bg-bg3 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-t0">{campus}</span>
                    <div className="flex items-center gap-2">
                      {stats.readingCount > 0 ? (
                        <>
                          <span className="text-xs text-t2">{stats.readingCount} readings</span>
                          {stats.alertCount > 0 && (
                            <span className="text-xs font-bold text-amber-400">{stats.alertCount} alerts</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-t2">No data</span>
                      )}
                    </div>
                  </div>
                  {stats.readingCount > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label:'pH',    val:stats.avgPh },
                        { label:'TDS',   val:stats.avgTds ? `${Math.round(stats.avgTds)}` : 'N/A' },
                        { label:'Turb',  val:stats.avgTurbidity },
                        { label:'Temp',  val:stats.avgTemp ? `${stats.avgTemp}°` : 'N/A' },
                      ].map(m => (
                        <div key={m.label} className="bg-bg2 rounded-lg p-2 text-center">
                          <div className="text-xs font-bold text-t0">{m.val}</div>
                          <div className="text-[9px] text-t2">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="px-5 py-2 bg-bg1 border-t border-border">
        <span className="text-[10px] text-t2">💧 Generated by AquaAI · Based on last 24 hours of sensor data</span>
      </div>
    </div>
  );
}
