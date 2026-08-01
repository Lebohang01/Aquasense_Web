export type SANSStatus = 'SAFE' | 'CAUTION' | 'UNSAFE';
export interface Reading {
  id?: string; node_id?: string; ph?: number; tds?: number;
  turbidity?: number; temperature?: number; sans_status?: SANSStatus; created_at?: string;
}
export interface EvalResult {
  status: SANSStatus; issues: string[];
  color: string; bg: string; emoji: string; badge: string;
}
export function evaluateReading(r: Reading): EvalResult {
  const issues: string[] = [];
  if (r.ph !== undefined && (r.ph < 5.0 || r.ph > 9.7)) issues.push('pH');
  if (r.tds !== undefined && r.tds > 1200) issues.push('TDS');
  if (r.turbidity !== undefined && r.turbidity > 5) issues.push('Turbidity');
  if (r.temperature !== undefined && (r.temperature < 5 || r.temperature > 25)) issues.push('Temperature');
  if (issues.length === 0)
    return { status:'SAFE',    issues:[], color:'#22c55e', bg:'rgba(34,197,94,0.12)',  emoji:'✅', badge:'bg-green-500/20 text-green-400 border-green-500/30' };
  const severe = (r.ph !== undefined && (r.ph < 4 || r.ph > 11)) ||
    (r.tds !== undefined && r.tds > 2400) || (r.turbidity !== undefined && r.turbidity > 10);
  if (severe)
    return { status:'UNSAFE',  issues, color:'#ef4444', bg:'rgba(239,68,68,0.12)',  emoji:'🚨', badge:'bg-red-500/20 text-red-400 border-red-500/30' };
  return   { status:'CAUTION', issues, color:'#f59e0b', bg:'rgba(245,158,11,0.12)', emoji:'⚠️', badge:'bg-amber-500/20 text-amber-400 border-amber-500/30' };
}
export const CAMPUS_LABELS: Record<string,string> = {
  'UJ APK':'Auckland Park Kingsway','UJ APB':'Auckland Park Bunting Road',
  'UJ SWC':'Soweto Campus','UJ DFC':'Doornfontein Campus',
};
export const PARAM_META: Record<string,{label:string;unit:string;icon:string;safe:string;color:string}> = {
  ph:          {label:'pH',         unit:'',    icon:'⚗️',safe:'5.0–9.7',color:'#3b82f6'},
  tds:         {label:'TDS',        unit:'mg/L',icon:'⚡',safe:'≤ 1200', color:'#f59e0b'},
  turbidity:   {label:'Turbidity',  unit:'NTU', icon:'💡',safe:'≤ 5',   color:'#8b5cf6'},
  temperature: {label:'Temperature',unit:'°C',  icon:'🌡️',safe:'5–25',  color:'#06b6d4'},
};
