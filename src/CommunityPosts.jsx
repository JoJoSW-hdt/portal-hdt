import React, { useEffect, useRef, useState } from "react";
import RichTextEditor, { cleanHtml } from "./RichTextEditor";
import { fetchCommunityFeed } from "./lib/communityData";
import { Heart, MessageCircle, Image as ImageIcon, Send, Pencil, Trash2, X, Newspaper } from "lucide-react";

const PAGE_SIZE = 10;

export default function CommunityPosts({supabase,profile,canModerate=false,onMessage=()=>{}}) {
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const [hasMore,setHasMore]=useState(false);
  const [selected,setSelected]=useState(null);
  const [comment,setComment]=useState("");
  const [busy,setBusy]=useState(false);
  const [editing,setEditing]=useState(null);
  const [composer,setComposer]=useState(false);
  const requestVersion=useRef(0);
  const loadingMoreRef=useRef(false);
  const canInteract=profile?.status==="approved";

  async function refresh(){
    const requestId=++requestVersion.current;
    setLoading(true);
    try {
      const visibleCount=Math.max(posts.length,PAGE_SIZE);
      const feed = await fetchCommunityFeed(supabase,{offset:0,limit:visibleCount});
      if(requestId!==requestVersion.current)return;
      setPosts(feed.posts);
      setHasMore(feed.hasMore);
    } catch (error) {
      if(requestId===requestVersion.current)onMessage(error.message);
    } finally {
      if(requestId===requestVersion.current)setLoading(false);
    }
  }
  useEffect(()=>{
    refresh();
    return ()=>{requestVersion.current+=1;};
  },[supabase]);

  async function loadMore(){
    if(loadingMoreRef.current||!hasMore)return;
    loadingMoreRef.current=true;
    const requestId=++requestVersion.current;
    setLoadingMore(true);
    try {
      const feed = await fetchCommunityFeed(supabase,{offset:posts.length,limit:PAGE_SIZE});
      if(requestId!==requestVersion.current)return;
      setPosts(current=>{
        const known=new Set(current.map(post=>post.id));
        return [...current,...feed.posts.filter(post=>!known.has(post.id))];
      });
      setHasMore(feed.hasMore);
    } catch(error) {
      if(requestId===requestVersion.current)onMessage(error.message);
    } finally {
      loadingMoreRef.current=false;
      if(requestId===requestVersion.current)setLoadingMore(false);
    }
  }

  const selectedPost=selected?posts.find(p=>p.id===selected):null;
  async function savePost(html,id=null){
    if(!canInteract){onMessage("Apenas membros aprovados podem publicar no mural.");return;}
    if(!html.replace(/<[^>]*>/g,"").trim()&&!html.includes("<img")){onMessage("Escreva algo antes de publicar.");return;}
    setBusy(true);
    const query=id
      ? supabase.from("community_posts").update({body_html:html,updated_at:new Date().toISOString()}).eq("id",id).eq("author_id",profile.id)
      : supabase.from("community_posts").insert({author_id:profile.id,body_html:html});
    const {error}=await query;
    setBusy(false);
    if(error){onMessage(error.message);return;}
    setComposer(false);setEditing(null);onMessage(id?"Publicação atualizada.":"Publicação compartilhada com a comunidade.");await refresh();
  }
  async function toggleHeart(post){
    if(!canInteract){onMessage("Apenas membros aprovados podem reagir às publicações.");return;}
    const mine=post.reactions.find(r=>r.member_id===profile.id);
    const {error}=mine
      ? await supabase.from("community_post_reactions").delete().eq("id",mine.id)
      : await supabase.from("community_post_reactions").insert({post_id:post.id,member_id:profile.id,reaction:"heart"});
    if(error){onMessage(error.message);return;} await refresh();
  }
  async function sendComment(e){
    e.preventDefault();if(!canInteract){onMessage("Apenas membros aprovados podem comentar.");return;}if(!selectedPost||!comment.trim())return;
    setBusy(true);
    const {error}=await supabase.from("community_post_comments").insert({post_id:selectedPost.id,author_id:profile.id,body:comment.trim()});
    setBusy(false);if(error){onMessage(error.message);return;}setComment("");await refresh();
  }
  async function removeComment(id){if(!window.confirm("Excluir este comentário?"))return;const {error}=await supabase.from("community_post_comments").delete().eq("id",id);if(error)onMessage(error.message);else await refresh();}
  async function removePost(id){if(!window.confirm("Excluir esta publicação e seus comentários?"))return;const {error}=await supabase.from("community_posts").delete().eq("id",id);if(error){onMessage(error.message);return;}setSelected(null);await refresh();onMessage("Publicação excluída.");}
  const canManage=(post)=>canInteract&&(post?.author_id===profile.id||canModerate);
  function authorLine(person){return <><span className="post-avatar">{person?.avatar_url?<img src={person.avatar_url} alt=""/>:person?.display_name?.slice(0,1)||"H"}</span><span><strong>{person?.display_name||"Aventureiro"}</strong><small>{person?.role==="founder"?"Fundador":person?.role==="staff"?"Staff":`@${person?.username||"membro"}`}</small></span></>;}
  function postActions(post){const mine=!!profile&&post.reactions.some(r=>r.member_id===profile.id);return <div className="post-actions"><button className={mine?"reacted":""} disabled={!canInteract} title={!canInteract?"Apenas membros aprovados podem reagir":""} onClick={()=>toggleHeart(post)}><Heart size={17} fill={mine?"currentColor":"none"}/>{post.reactions.length||0} coração{post.reactions.length===1?"":"s"}</button><button onClick={()=>setSelected(post.id)}><MessageCircle size={17}/>{post.comments.length||0} comentário{post.comments.length===1?"":"s"}</button></div>;}
  return <section className="content community-content">
    <div className="community-heading"><div><span className="eyebrow">MURAL DOS AVENTUREIROS</span><h2>Comunidade</h2><p>Compartilhe suas histórias, imagens e momentos com todos.</p></div></div>
    {canInteract&&<div className="community-composer panel">
      {composer?<RichTextEditor supabase={supabase} profile={profile} onSave={html=>savePost(html)} onCancel={()=>setComposer(false)} busy={busy}/>:<button className="composer-trigger" onClick={()=>setComposer(true)}><span className="post-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:profile.display_name?.slice(0,1)||"H"}</span><span>O que você gostaria de compartilhar?</span><ImageIcon size={19}/></button>}
    </div>}
    {loading?<div className="empty-state">Carregando publicações...</div>:posts.length?<>
      {posts.map(post=><article className="community-post panel" key={post.id}>
        <div className="post-header">{authorLine(post.author)}<time>{new Date(post.created_at).toLocaleString("pt-BR")}{post.updated_at!==post.created_at?" · editada":""}</time></div>
        {editing===post.id?<RichTextEditor initialHtml={post.body_html} profile={profile} supabase={supabase} onSave={html=>savePost(html,post.id)} onCancel={()=>setEditing(null)} busy={busy} submitLabel="Salvar edição"/>:<><div className="post-open-area" role="button" tabIndex={0} onClick={()=>setSelected(post.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setSelected(post.id);}}><div className="post-rich-content" dangerouslySetInnerHTML={{__html:cleanHtml(post.body_html)}}/><span className="post-read-more">Abrir publicação e comentários</span></div>{postActions(post)}</>}
        {canManage(post)&&<div className="post-management">{post.author_id===profile.id&&<button onClick={()=>setEditing(post.id)}><Pencil size={14}/>Editar</button>}<button onClick={()=>removePost(post.id)}><Trash2 size={14}/>Excluir</button></div>}
      </article>)}
      {hasMore&&<div className="community-load-more"><button className="outline-btn" disabled={loadingMore} onClick={loadMore}>{loadingMore?"Carregando...":"Carregar mais publicações"}</button></div>}
    </>:<div className="empty-public"><div className="empty-public-icon"><Newspaper/></div><strong>O mural ainda está vazio</strong><span>Seja o primeiro a compartilhar uma história com os aventureiros!</span></div>}
    {selectedPost&&<div className="modal-backdrop post-modal-backdrop" onClick={()=>setSelected(null)}><section className="post-detail-modal" onClick={e=>e.stopPropagation()}>
      <button className="modal-close" onClick={()=>setSelected(null)} aria-label="Fechar publicação"><X/></button>
      <div className="post-header">{authorLine(selectedPost.author)}<time>{new Date(selectedPost.created_at).toLocaleString("pt-BR")}</time></div>
      <div className="post-rich-content post-detail-body" dangerouslySetInnerHTML={{__html:cleanHtml(selectedPost.body_html)}}/>
      {postActions(selectedPost)}
      <div className="post-comments"><h3>Comentários ({selectedPost.comments.length})</h3>
        {selectedPost.comments.map(c=><div className="post-comment" key={c.id}><div className="post-header">{authorLine(c.author)}<time>{new Date(c.created_at).toLocaleString("pt-BR")}</time></div><p>{c.body}</p>{((canInteract&&c.author_id===profile.id)||canModerate)&&<button className="comment-delete" onClick={()=>removeComment(c.id)}><Trash2 size={13}/>Excluir</button>}</div>)}
        {canInteract?<form className="comment-form" onSubmit={sendComment}><input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Escreva um comentário..." maxLength={2000}/><button className="primary-btn" disabled={busy||!comment.trim()}><Send size={15}/>Enviar</button></form>:<p className="login-to-interact">Apenas membros aprovados podem comentar e reagir.</p>}
      </div>
    </section></div>}
  </section>;
}
