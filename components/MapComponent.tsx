'use client';
import { useEffect, useRef } from 'react';
import { evaluateReading, CAMPUS_LABELS } from '@/lib/sans241';

// Campus centre regions for auto-zoom
const CAMPUS_REGIONS: Record<string,{lat:number;lng:number;zoom:number}> = {
  All:    { lat:-26.210, lng:28.010, zoom:11 },
  'UJ APK':{ lat:-26.18192, lng:27.99831, zoom:16 },
  'UJ APB':{ lat:-26.19042, lng:28.01931, zoom:16 },
  'UJ DFC':{ lat:-26.19239, lng:28.05803, zoom:16 },
  'UJ SWC':{ lat:-25.25953, lng:27.92397, zoom:16 },
};

function getMarkerColor(node: any, readings: Record<string,any>): string {
  if (node.status !== 'online') return '#475569';
  const reading = readings[node.node_id];
  if (!reading) return '#3b82f6';
  const ev = evaluateReading(reading);
  return ev.color;
}

interface Props {
  nodes: any[];
  readings: Record<string, any>;
  selectedCampus: string;
}

export default function MapComponent({ nodes, readings, selectedCampus }: Props) {
  const mapRef    = useRef<any>(null);
  const mapInstance = useRef<any>(null);
  const markersRef  = useRef<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current) return;
      if (mapInstance.current) return; // already initialised

      const region = CAMPUS_REGIONS[selectedCampus] || CAMPUS_REGIONS.All;

      mapInstance.current = L.map(mapRef.current, {
        center: [region.lat, region.lng],
        zoom:   region.zoom,
        zoomControl: true,
      });

      // Dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19,
      }).addTo(mapInstance.current);
    };

    initMap();
  }, []);

  // Update markers when nodes/readings change
  useEffect(() => {
    if (!mapInstance.current) return;

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default;

      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      nodes.forEach(node => {
        if (!node.latitude || !node.longitude) return;
        const color = getMarkerColor(node, readings);
        const reading = readings[node.node_id];
        const ev = reading ? evaluateReading(reading) : null;

        // Custom SVG marker
        const svgIcon = L.divIcon({
          html: `
            <div style="position:relative;width:40px;height:40px">
              <div style="position:absolute;inset:0;background:${color};opacity:0.2;border-radius:50%;animation:ping 2s cubic-bezier(0,0,.2,1) infinite"></div>
              <div style="position:absolute;inset:4px;background:${color};border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">💧</div>
            </div>`,
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -20],
        });

        const popup = L.popup({
          className: 'aquasense-popup',
          maxWidth: 220,
        }).setContent(`
          <div style="background:#151c30;border:1px solid #1e2d47;border-radius:12px;padding:14px;font-family:Inter,sans-serif;min-width:180px">
            <div style="font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:3px">${node.location_name}</div>
            <div style="font-size:11px;color:#475569;margin-bottom:8px">${node.campus} · ${CAMPUS_LABELS[node.campus]||''}</div>
            ${ev ? `<div style="font-size:11px;font-weight:700;color:${ev.color};background:${ev.bg};border:1px solid ${ev.color}30;padding:4px 10px;border-radius:8px;display:inline-block;margin-bottom:8px">${ev.emoji} ${ev.status}</div>` : ''}
            ${reading ? `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">
                <div style="background:#1c2540;border-radius:6px;padding:6px;text-align:center">
                  <div style="font-size:13px;font-weight:700;color:#f1f5f9">${reading.ph?.toFixed(1)||'—'}</div>
                  <div style="font-size:9px;color:#475569">pH</div>
                </div>
                <div style="background:#1c2540;border-radius:6px;padding:6px;text-align:center">
                  <div style="font-size:13px;font-weight:700;color:#f1f5f9">${reading.tds?Math.round(reading.tds):'—'}</div>
                  <div style="font-size:9px;color:#475569">TDS mg/L</div>
                </div>
                <div style="background:#1c2540;border-radius:6px;padding:6px;text-align:center">
                  <div style="font-size:13px;font-weight:700;color:#f1f5f9">${reading.turbidity?.toFixed(1)||'—'}</div>
                  <div style="font-size:9px;color:#475569">NTU</div>
                </div>
                <div style="background:#1c2540;border-radius:6px;padding:6px;text-align:center">
                  <div style="font-size:13px;font-weight:700;color:#f1f5f9">${reading.temperature?.toFixed(1)||'—'}</div>
                  <div style="font-size:9px;color:#475569">°C</div>
                </div>
              </div>` : '<div style="font-size:11px;color:#475569;margin-top:4px">No readings yet</div>'}
            <div style="font-size:10px;color:${node.status==='online'?'#22c55e':'#475569'};margin-top:8px">● ${node.status}</div>
          </div>`);

        const marker = L.marker([node.latitude, node.longitude], { icon: svgIcon })
          .bindPopup(popup)
          .addTo(mapInstance.current);

        markersRef.current.push(marker);
      });
    };

    updateMarkers();
  }, [nodes, readings]);

  // Pan to campus when filter changes
  useEffect(() => {
    if (!mapInstance.current) return;
    const region = CAMPUS_REGIONS[selectedCampus] || CAMPUS_REGIONS.All;
    mapInstance.current.flyTo([region.lat, region.lng], region.zoom, { duration: 1 });
  }, [selectedCampus]);

  return (
    <div ref={mapRef} style={{ width:'100%', height:'100%', background:'#0a0e1a' }}>
      <style>{`
        .leaflet-popup-content-wrapper { background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; }
        .leaflet-popup-content { margin:0 !important; }
        .leaflet-popup-tip-container { display:none }
        .leaflet-control-zoom a { background:#151c30 !important; color:#f1f5f9 !important; border-color:#1e2d47 !important; }
        .leaflet-control-zoom a:hover { background:#1c2540 !important; }
        .leaflet-control-attribution { background:rgba(10,14,26,0.8) !important; color:#475569 !important; font-size:9px !important; }
        @keyframes ping { 75%,100%{transform:scale(2);opacity:0} }
      `}</style>
    </div>
  );
}
