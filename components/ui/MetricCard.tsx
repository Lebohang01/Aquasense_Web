interface Props { icon:string; label:string; value:string|number; unit:string; safe:string; color:string; inRange:boolean; }
export default function MetricCard({ icon,label,value,unit,safe,color,inRange }:Props) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{background:`${color}20`}}>{icon}</div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${inRange?'text-green-400 bg-green-500/10 border-green-500/20':'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
          {inRange ? 'OK' : 'CHECK'}
        </span>
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight text-t0" style={{color: inRange ? undefined : '#f59e0b'}}>
          {typeof value === 'number' ? (value > 100 ? Math.round(value) : value.toFixed(label === 'pH' ? 1 : 1)) : '—'}
          <span className="text-sm font-normal text-t2 ml-1">{unit}</span>
        </div>
        <div className="text-xs text-t2 mt-1">{label} · SANS: {safe}</div>
      </div>
    </div>
  );
}
