'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

const CAT_STYLES: Record<string,{color:string;bg:string;emoji:string;label:string}> = {
  general:       {color:'#60a5fa',bg:'rgba(59,130,246,0.12)', emoji:'💬',label:'General'},
  water_quality: {color:'#06b6d4',bg:'rgba(6,182,212,0.12)',  emoji:'💧',label:'Water Quality'},
  alert:         {color:'#f87171',bg:'rgba(239,68,68,0.12)',  emoji:'🚨',label:'Alert'},
  resolved:      {color:'#4ade80',bg:'rgba(34,197,94,0.12)',  emoji:'✅',label:'Resolved'},
  tip:           {color:'#fbbf24',bg:'rgba(245,158,11,0.12)', emoji:'💡',label:'Tip'},
  question:      {color:'#a78bfa',bg:'rgba(139,92,246,0.12)',emoji:'❓',label:'Question'},
};

const CATS = [
  {value:'all',emoji:'🌊',label:'All'},
  ...Object.entries(CAT_STYLES).map(([v,s])=>({value:v,emoji:s.emoji,label:s.label})),
];

function strColor(s:string){
  const c=['#1e3a5f','#1a3d2e','#2e1a5a','#3d2e0a','#0a2e3d','#2e0a2e'];
  let h=0;for(let i=0;i<s.length;i++)h=s.charCodeAt(i)+((h<<5)-h);
  return c[Math.abs(h)%c.length];
}

function Avatar({email,size=8}:{email:string;size?:number}){
  return(
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
      style={{backgroundColor:strColor(email)}}>
      {email[0]?.toUpperCase()}
    </div>
  );
}

function NewPostModal({onClose,onPost,userId}:{onClose:()=>void;onPost:()=>void;userId:string}){
  const [title,   setTitle]   = useState('');
  const [body,    setBody]    = useState('');
  const [cat,     setCat]     = useState('general');
  const [campus,  setCampus]  = useState('');
  const [saving,  setSaving]  = useState(false);

  const submit = async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!title.trim()||!body.trim())return;
    setSaving(true);
    await supabase.from('community_posts').insert({
      user_id:userId, title:title.trim(), body:body.trim(),
      category:cat, campus:campus||null,
    });
    setSaving(false);
    onPost();
    onClose();
  };

  return(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg bg-bg1 border border-border rounded-2xl p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-t0">New Post</h2>
          <button onClick={onClose} className="text-t2 hover:text-t0 text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-t1 uppercase tracking-wide mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CAT_STYLES).map(([v,s])=>(
                <button key={v} type="button" onClick={()=>setCat(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${cat===v?'text-white border-transparent':'border-border text-t1 hover:text-t0'}`}
                  style={cat===v?{background:s.color}:{}}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-t1 uppercase tracking-wide mb-2">Title *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={100}
              placeholder="What's happening with the water?"
              className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-t0 text-sm placeholder-t2 focus:outline-none focus:border-blue transition-colors"/>
          </div>
          {/* Body */}
          <div>
            <label className="block text-xs font-bold text-t1 uppercase tracking-wide mb-2">Message *</label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} required maxLength={1000} rows={4}
              placeholder="Share your observations, results or message..."
              className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-t0 text-sm placeholder-t2 focus:outline-none focus:border-blue transition-colors resize-none"/>
          </div>
          {/* Campus */}
          <div>
            <label className="block text-xs font-bold text-t1 uppercase tracking-wide mb-2">Campus (optional)</label>
            <div className="flex flex-wrap gap-2">
              {['','UJ APK','UJ APB','UJ SWC','UJ DFC'].map(c=>(
                <button key={c} type="button" onClick={()=>setCampus(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${campus===c?'bg-blue/20 border-blue text-blight':'border-border text-t1 hover:text-t0'}`}>
                  {c||'All'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-bg2 border border-border rounded-xl text-sm font-semibold text-t1 hover:text-t0 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving||!title.trim()||!body.trim()}
              className="flex-1 py-3 bg-blue hover:bg-blue/90 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all">
              {saving?'Posting...':'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CommunityPage(){
  const router = useRouter();
  const [posts,     setPosts]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [cat,       setCat]       = useState('all');
  const [search,    setSearch]    = useState('');
  const [userId,    setUserId]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const chRef = useRef<any>(null);

  const fetchPosts = useCallback(async()=>{
    let q = supabase.from('community_posts')
      .select('*,users(id,email),nodes(node_id,location_name,campus),community_comments(id)')
      .order('is_pinned',{ascending:false})
      .order('created_at',{ascending:false});
    if(cat!=='all') q=q.eq('category',cat);
    const{data}=await q;
    if(data&&userId){
      const ids=data.map((p:any)=>p.id);
      const{data:likes}=await supabase.from('post_likes').select('post_id').eq('user_id',userId).in('post_id',ids);
      const ls=new Set((likes||[]).map((l:any)=>l.post_id));
      setPosts(data.map((p:any)=>({...p,comment_count:p.community_comments?.length||0,user_liked:ls.has(p.id)})));
    } else {
      setPosts((data||[]).map((p:any)=>({...p,comment_count:p.community_comments?.length||0})));
    }
    setLoading(false);
  },[cat,userId]);

  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!user){router.push('/login');return;}
      setUserId(user.id);
    });
  },[router]);

  useEffect(()=>{
    if(!userId)return;
    fetchPosts();
    if(chRef.current)supabase.removeChannel(chRef.current);
    const ch=supabase.channel('community-web-'+Date.now())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'community_posts'},()=>fetchPosts())
      .subscribe();
    chRef.current=ch;
    return()=>{if(chRef.current)supabase.removeChannel(chRef.current);};
  },[fetchPosts,userId]);

  const handleLike=async(postId:string,liked:boolean)=>{
    if(!userId)return;
    if(liked){
      await supabase.from('post_likes').delete().eq('post_id',postId).eq('user_id',userId);
      await supabase.from('community_posts').update({likes:Math.max(0,(posts.find((p:any)=>p.id===postId)?.likes||1)-1)}).eq('id',postId);
      setPosts(prev=>prev.map((p:any)=>p.id===postId?{...p,likes:Math.max(0,p.likes-1),user_liked:false}:p));
    } else {
      await supabase.from('post_likes').insert({post_id:postId,user_id:userId});
      await supabase.from('community_posts').update({likes:(posts.find((p:any)=>p.id===postId)?.likes||0)+1}).eq('id',postId);
      setPosts(prev=>prev.map((p:any)=>p.id===postId?{...p,likes:p.likes+1,user_liked:true}:p));
    }
  };

  const filtered=posts.filter(p=>!search||p.title.toLowerCase().includes(search.toLowerCase())||p.body.toLowerCase().includes(search.toLowerCase()));

  return(
    <div className="min-h-screen bg-bg0">
      <Navbar/>
      <div className="pt-16">
        <div className="bg-bg1 border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-t0">💬 Community</h1>
                <p className="text-t2 text-sm mt-1">UJ Water Quality Forum</p>
              </div>
              <button onClick={()=>setShowModal(true)}
                className="flex items-center gap-2 bg-blue hover:bg-blue/90 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all">
                ＋ New Post
              </button>
            </div>
            {/* Search */}
            <div className="flex items-center gap-3 mt-4 bg-bg2 border border-border rounded-xl px-4 py-2.5">
              <span className="text-t2">🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search posts..." className="flex-1 bg-transparent text-t0 text-sm placeholder-t2 focus:outline-none"/>
              {search&&<button onClick={()=>setSearch('')} className="text-t2 hover:text-t0">✕</button>}
            </div>
            {/* Cat chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {CATS.map(c=>(
                <button key={c.value} onClick={()=>setCat(c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${cat===c.value?'bg-blue/20 border-blue text-blight':'border-border text-t1 hover:text-t0'}`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          {loading?(
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 rounded-full border-2 border-border border-t-blue animate-spin"/>
            </div>
          ):filtered.length===0?(
            <div className="text-center py-20">
              <div className="text-5xl mb-4">💧</div>
              <p className="text-t2 text-lg">No posts yet</p>
              <button onClick={()=>setShowModal(true)} className="mt-4 btn-primary text-sm">Be the first to post</button>
            </div>
          ):(
            filtered.map((post:any)=>{
              const cs=CAT_STYLES[post.category]||CAT_STYLES.general;
              return(
                <div key={post.id} className={`card p-5 hover:border-blue/30 transition-all ${post.is_pinned?'border-amber-500/30':''}`}>
                  {post.is_pinned&&<div className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full inline-block mb-3">📌 Pinned</div>}
                  {/* Head */}
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar email={post.users?.email||'?'} size={9}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-bold text-t0">{post.users?.email?.split('@')[0]||'Anonymous'}</span>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full border" style={{color:cs.color,background:cs.bg,borderColor:cs.color+'30'}}>
                          {cs.emoji} {cs.label}
                        </span>
                      </div>
                      <div className="text-xs text-t2 mt-0.5">
                        {post.campus||'All campuses'} · {formatDistanceToNow(new Date(post.created_at),{addSuffix:true})}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-t0 mb-2">{post.title}</h3>
                  <p className="text-sm text-t1 leading-relaxed line-clamp-3 mb-3">{post.body}</p>
                  {post.nodes&&(
                    <div className="inline-flex items-center gap-1.5 bg-bg3 text-blight text-xs font-medium px-3 py-1.5 rounded-lg mb-3">
                      📡 {post.nodes.location_name} · {post.nodes.campus}
                    </div>
                  )}
                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-3 border-t border-border">
                    <button onClick={()=>handleLike(post.id,post.user_liked)}
                      className="flex items-center gap-1.5 text-sm transition-colors hover:text-red-400"
                      style={post.user_liked?{color:'#f87171'}:{color:'#475569'}}>
                      <span>{post.user_liked?'❤️':'🤍'}</span>
                      <span className="font-medium">{post.likes}</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-sm text-t2">
                      <span>💬</span>
                      <span className="font-medium">{post.comment_count}</span>
                    </div>
                    <button className="ml-auto text-xs font-semibold text-blight hover:text-blue transition-colors">
                      View post →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {showModal&&<NewPostModal onClose={()=>setShowModal(false)} onPost={fetchPosts} userId={userId}/>}
    </div>
  );
}
