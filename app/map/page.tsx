'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabase';
import { evaluateReading, CAMPUS_LABELS } from '@/lib/sans241';

// Leaflet must be loaded client-side only
const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function MapPage() {
  const [nodes,   setNodes]   = useState<any[]>([]);
  const [readings,setReadings]= useState<Record<string,any>>({});
  const [loading, setLoading] = useState(true);
  const [campus,  setCampus]  = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      const { data: nodes } = await supabase.from('nodes').select('*').order('campus');
      setNodes(nodes || []);

      // Fetch latest reading per node
      if (nodes) {
        const map: Record<string,any> = {};
        await Promise.all(nodes.map(async (n: any) => {
          const { data } = await supabase.from('readings').select('*')
            .eq('node_id', n.node_id).order('created_at', { ascending: false }).limit(1).single();
          if (data) map[n.node_id] = data;
        }));
        setReadings(map);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const campuses = ['All', ...Array.from(new Set(nodes.map((n: any) => n.campus)))];
  const filtered = campus === 'All' ? nodes : nodes.filter((n: any) => n.campus === campus);
  const onlineCount = nodes.filter((n: any) => n.status === 'online').length;

  return (
    <div className="min-h-screen bg-bg0">
      <Navbar />
      <div className="pt-16 flex flex-col h-screen">
        {/* Header */}
        <div className="bg-bg1 border-b border-border px-6 py-4 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-t0">🗺️ Campus Map</h1>
              <p className="text-t2 text-xs mt-0.5">{filtered.length} monitoring nodes · {onlineCount} online</p>
            </div>
            {/* Campus filter */}
            <div className="flex flex-wrap gap-2">
              {campuses.map(c => (
                <button key={c} onClick={() => setCampus(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${campus === c ? 'bg-blue/20 border-blue text-blight' : 'border-border text-t1 hover:text-t0 hover:border-blue/30'}`}>
                  {c === 'All' ? 'All Campuses' : c}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="max-w-7xl mx-auto mt-3 flex items-center gap-5 flex-wrap">
            {[
              { color:'#22c55e', label:'SAFE' },
              { color:'#f59e0b', label:'CAUTION' },
              { color:'#ef4444', label:'UNSAFE' },
              { color:'#475569', label:'Offline' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }}/>
                <span className="text-xs text-t1 font-medium">{l.label}</span>
              </div>
            ))}
            <span className="text-xs text-t2 ml-auto">SANS 241:2015</span>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-bg0">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full border-2 border-border border-t-blue animate-spin mx-auto mb-3"/>
                <p className="text-t2 text-sm">Loading campus nodes...</p>
              </div>
            </div>
          ) : (
            <MapComponent nodes={filtered} readings={readings} selectedCampus={campus} />
          )}
        </div>
      </div>
    </div>
  );
}
