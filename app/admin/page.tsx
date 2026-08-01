'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

const ROLE_STYLE:Record<string,string>={
  admin:      'bg-purple-500/20 text-purple-300 border-purple-500/30',
  technician: 'bg-amber-500/20  text-amber-300  border-amber-500/30',
  student:    'bg-blue-500/20   text-blue-300   border-blue-500/30',
};
const STATUS_STYLE:Record<string,string>={
  online:      'bg-green-500/20 text-green-400 border-green-500/30',
  offline:     'bg-bg3 text-t2 border-border',
  maintenance: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};
const REPORT_STATUS:Record<string,{color:string;badge:string;emoji:string}>={
  open:          {color:'#f87171',badge:'bg-red-500/20 text-red-400 border-red-500/30',   emoji:'🔴'},
  investigating: {color:'#fbbf24',badge:'bg-amber-500/20 text-amber-400 border-amber-500/30',emoji:'🟡'},
  resolved:      {color:'#4ade80',badge:'bg-green-500/20 text-green-400 border-green-500/30',emoji:'🟢'},
};

type Tab = 'overview'|'users'|'nodes'|'reports';

export default function AdminPage(){
  const router = useRouter();
  const [tab,     setTab]     = useState<Tab>('overview');
  const [stats,   setStats]   = useState({users:0,nodes:0,alerts:0,reports:0,readings:0});
  const [users,   setUsers]   = useState<any[]>([]);
  const [nodes,   setNodes]   = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    supabase.auth.getUser().then(async({data:{user}})=>{
      if(!user){router.push('/login');return;}
      const{data:profile}=await supabase.from('users').select('role').eq('id',user.id).single();
      if(profile?.role!=='admin'){router.push('/dashboard');return;}
      loadAll();
    });
  },[router]);

  const loadAll = useCallback(async()=>{
    setLoading(true);
    const[u,n,r,a,rd]=await Promise.all([
      supabase.from('users').select('*').order('created_at',{ascending:false}),
      supabase.from('nodes').select('*').order('campus').order('location_name'),
      supabase.from('reports').select('*,users(email,role,campus_preference),nodes(location_name,campus)').order('created_at',{ascending:false}),
      supabase.from('alerts').select('id',{count:'exact',head:true}).is('resolved_at',null),
      supabase.from('readings').select('id',{count:'exact',head:true}),
    ]);
    setUsers(u.data||[]);
    setNodes(n.data||[]);
    setReports(r.data||[]);
    setStats({users:u.data?.length||0,nodes:n.data?.length||0,alerts:a.count||0,reports:r.data?.length||0,readings:rd.count||0});
    setLoading(false);
  },[]);

  const updateUserRole=async(id:string,role:string)=>{
    await supabase.from('users').update({role}).eq('id',id);
    setUsers(prev=>prev.map(u=>u.id===id?{...u,role}:u));
  };

  const toggleNodeStatus=async(nodeId:string,current:string)=>{
    const status=current==='online'?'offline':'online';
    await supabase.from('nodes').update({status}).eq('node_id',nodeId);
    setNodes(prev=>prev.map(n=>n.node_id===nodeId?{...n,status}:n));
  };

  const deleteNode=async(nodeId:string)=>{
    if(!confirm('Delete this node and all its readings?'))return;
    await supabase.from('nodes').delete().eq('node_id',nodeId);
    setNodes(prev=>prev.filter(n=>n.node_id!==nodeId));
  };

  const updateReportStatus=async(id:string,status:string)=>{
    await supabase.from('reports').update({status}).eq('id',id);
    setReports(prev=>prev.map(r=>r.id===id?{...r,status}:r));
  };

  const TABS:Array<{id:Tab;label:string;emoji:string;count?:number}> = [
    {id:'overview',label:'Overview', emoji:'📊'},
    {id:'users',   label:'Users',    emoji:'👥', count:stats.users},
    {id:'nodes',   label:'Nodes',    emoji:'📡', count:stats.nodes},
    {id:'reports', label:'Reports',  emoji:'📝', count:stats.reports},
  ];

  return(
    <div className="min-h-screen bg-bg0">
      <Navbar/>
      <div className="pt-16">
        <div className="bg-bg1 border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-t0 flex items-center gap-2">⚙️ Admin Panel
                  <span className="text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">ADMIN</span>
                </h1>
                <p className="text-t2 text-sm mt-1">Manage users, nodes, campuses and reports</p>
              </div>
              <button onClick={loadAll} className="flex items-center gap-2 bg-bg2 border border-border hover:border-blue/40 rounded-xl px-4 py-2 text-sm text-t1 hover:text-t0 transition-all">
                🔄 Refresh
              </button>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 mt-5 bg-bg2 border border-border rounded-xl p-1 w-fit">
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab===t.id?'bg-blue text-white shadow':'text-t1 hover:text-t0'}`}>
                  <span>{t.emoji}</span>{t.label}
                  {t.count!==undefined&&<span className={`text-xs px-1.5 py-0.5 rounded-full ${tab===t.id?'bg-white/20':'bg-bg3'}`}>{t.count}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {loading?(
            <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-2 border-border border-t-blue animate-spin"/></div>
          ):(
            <>
              {/* OVERVIEW */}
              {tab==='overview'&&(
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      {emoji:'👥',label:'Users',    val:stats.users,   color:'text-blue-400'},
                      {emoji:'📡',label:'Nodes',    val:stats.nodes,   color:'text-green-400'},
                      {emoji:'🚨',label:'Alerts',   val:stats.alerts,  color:'text-red-400'},
                      {emoji:'📝',label:'Reports',  val:stats.reports, color:'text-amber-400'},
                      {emoji:'📊',label:'Readings', val:stats.readings,color:'text-purple-400'},
                    ].map(s=>(
                      <div key={s.label} className="card p-5 text-center">
                        <div className="text-3xl mb-2">{s.emoji}</div>
                        <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div>
                        <div className="text-xs text-t2 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Quick actions */}
                  <div className="card p-5">
                    <h3 className="text-sm font-bold text-t1 uppercase tracking-wide mb-4">Quick Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={async()=>{
                        if(!confirm('Resolve ALL active alerts?'))return;
                        await supabase.from('alerts').update({resolved_at:new Date().toISOString()}).is('resolved_at',null);
                        setStats(s=>({...s,alerts:0}));
                      }} className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold rounded-xl hover:bg-green-500/20 transition-all">
                        ✅ Resolve All Alerts
                      </button>
                      <button onClick={()=>setTab('nodes')} className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-border text-t1 text-sm font-semibold rounded-xl hover:text-t0 hover:border-blue/40 transition-all">
                        📡 Manage Nodes
                      </button>
                      <button onClick={()=>setTab('reports')} className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-border text-t1 text-sm font-semibold rounded-xl hover:text-t0 hover:border-blue/40 transition-all">
                        📝 View Reports
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* USERS */}
              {tab==='users'&&(
                <div className="space-y-3">
                  {users.map(u=>(
                    <div key={u.id} className="card p-4 flex items-center gap-4 flex-wrap">
                      <div className="w-10 h-10 rounded-full bg-blue/20 border border-blue/30 flex items-center justify-center text-blight font-bold flex-shrink-0">
                        {u.email?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-t0 text-sm truncate">{u.email}</div>
                        <div className="text-xs text-t2 mt-0.5">{u.campus_preference||'No campus'} · Joined {u.created_at?formatDistanceToNow(new Date(u.created_at),{addSuffix:true}):'—'}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ROLE_STYLE[u.role||'student']||ROLE_STYLE.student}`}>{u.role||'student'}</span>
                        <select value={u.role||'student'} onChange={e=>updateUserRole(u.id,e.target.value)}
                          className="bg-bg2 border border-border text-t0 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue">
                          <option value="student">Student</option>
                          <option value="technician">Technician</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* NODES */}
              {tab==='nodes'&&(
                <div className="space-y-3">
                  {nodes.map(n=>(
                    <div key={n.node_id} className="card p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-t0 text-sm">{n.location_name}</div>
                          <div className="text-xs text-t2 mt-0.5">{n.campus} · {n.latitude?.toFixed(5)}, {n.longitude?.toFixed(5)}</div>
                          <div className="text-[10px] text-t2 font-mono mt-1 truncate">{n.node_id}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[n.status]||STATUS_STYLE.offline}`}>{n.status}</span>
                          <button onClick={()=>toggleNodeStatus(n.node_id,n.status)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${n.status==='online'?'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20':'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'}`}>
                            {n.status==='online'?'Set Offline':'Set Online'}
                          </button>
                          <button onClick={()=>deleteNode(n.node_id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* REPORTS */}
              {tab==='reports'&&(
                <div className="space-y-3">
                  {reports.map(r=>{
                    const rs=REPORT_STATUS[r.status]||REPORT_STATUS.open;
                    const issueEmojis:Record<string,string>={taste:'👅',odour:'👃',colour:'🎨',pressure:'💧',other:'❓'};
                    return(
                      <div key={r.id} className="card p-5">
                        <div className="flex items-start gap-4 flex-wrap">
                          <div className="w-11 h-11 rounded-xl bg-bg3 flex items-center justify-center text-2xl flex-shrink-0">
                            {issueEmojis[r.issue_type]||'📝'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-t0 text-sm capitalize">{r.issue_type?.replace('_',' ')} Issue</span>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${rs.badge}`}>{rs.emoji} {r.status}</span>
                            </div>
                            <div className="text-xs text-t2">
                              📧 {r.users?.email||'Anonymous'} · 📍 {r.nodes?.location_name||'Unknown'} · {r.nodes?.campus}
                            </div>
                            {r.description&&<p className="text-sm text-t1 mt-2 leading-relaxed">{r.description}</p>}
                            <div className="text-xs text-t2 mt-2">{formatDistanceToNow(new Date(r.created_at),{addSuffix:true})}</div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <div className="text-xs text-t2 font-semibold uppercase tracking-wide mb-1">Update Status</div>
                            {['open','investigating','resolved'].map(s=>{
                              const ss=REPORT_STATUS[s];
                              return(
                                <button key={s} onClick={()=>updateReportStatus(r.id,s)} disabled={r.status===s}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all disabled:opacity-40 ${ss.badge}`}>
                                  {ss.emoji} {s.charAt(0).toUpperCase()+s.slice(1)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {reports.length===0&&(
                    <div className="text-center py-16">
                      <div className="text-5xl mb-3">📝</div>
                      <p className="text-t2">No reports yet</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
