import React, { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Image as ImageIcon, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Send, Pencil, Trash2, X, Newspaper } from "lucide-react";

const allowedTags = new Set(["P","BR","STRONG","B","EM","I","U","UL","OL","LI","H2","H3","BLOCKQUOTE","A","IMG","DIV"]);
function cleanHtml(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) { child.remove(); return; }
      if (!allowedTags.has(child.tagName)) {
        clean(child);
        child.replaceWith(...child.childNodes);
        return;
      }
      [...child.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (child.tagName === "A" && name === "href") {
          try {
            const url = new URL(attr.value, window.location.origin);
            if (!["http:", "https:"].includes(url.protocol)) child.removeAttribute(attr.name);
            else child.setAttribute("rel", "noopener noreferrer");
          } catch { child.removeAttribute(attr.name); }
        } else if (child.tagName === "IMG" && name === "src") {
          try {
            if (new URL(attr.value, window.location.origin).protocol !== "https:") child.removeAttribute(attr.name);
          } catch { child.removeAttribute(attr.name); }
        } else if (name === "style") {
          const match = attr.value.match(/text-align\s*:\s*(left|center|right|justify)/i);
          if (match) child.setAttribute("style", `text-align:${match[1].toLowerCase()}`);
          else child.removeAttribute(attr.name);
        } else if (child.tagName === "IMG" && name === "alt") {
          // Keep accessible image descriptions.
        } else if (child.tagName === "IMG" && name === "width" && /^\d{1,3}%?$/.test(attr.value)) {
          // Keep bounded numeric or percentage widths.
        } else child.removeAttribute(attr.name);
      });
      clean(child);
    });
  };
  clean(doc.body);
  return doc.body.innerHTML.trim();
}

function RichEditor({initialHtml="",onSave,onCancel,busy=false,submitLabel="Publicar",supabase,profile}) {
  const editor = useRef(null);
  const file = useRef(null);
  const [uploading,setUploading] = useState(false);
  useEffect(()=>{ if(editor.current) editor.current.innerHTML=initialHtml; },[initialHtml]);
  function command(name,value=null){ editor.current?.focus(); document.execCommand(name,false,value); }
  async function insertImage(image,supabase,profile){
    if(!image || !["image/png","image/jpeg","image/webp"].includes(image.type)) throw new Error("Use uma imagem PNG, JPG ou WebP.");
    if(image.size>5*1024*1024) throw new Error("A imagem deve ter até 5 MB.");
    setUploading(true);
    try {
      const ext=(image.name.split(".").pop()||"png").toLowerCase().replace(/[^a-z0-9]/g,"");
      const path=`posts/${profile.id}/${crypto.randomUUID()}.${ext}`;
      const {error}=await supabase.storage.from("portal-assets").upload(path,image,{contentType:image.type});
      if(error) throw error;
      const url=supabase.storage.from("portal-assets").getPublicUrl(path).data.publicUrl;
      editor.current?.focus();
      document.execCommand("insertHTML",false,`<p><img src="${url}" alt="Imagem da publicação" /></p><p><br></p>`);
    } finally { setUploading(false); }
  }
  return <form className="community-editor" onSubmit={e=>{e.preventDefault();onSave(cleanHtml(editor.current?.innerHTML||""));}}>
    <div className="editor-toolbar">
      <button type="button" title="Negrito" onClick={()=>command("bold")}><Bold size={16}/></button>
      <button type="button" title="Itálico" onClick={()=>command("italic")}><Italic size={16}/></button>
      <button type="button" title="Sublinhado" onClick={()=>command("underline")}><Underline size={16}/></button>
      <span/>
      <button type="button" title="Lista" onClick={()=>command("insertUnorderedList")}><List size={16}/></button>
      <button type="button" title="Alinhar à esquerda" onClick={()=>command("justifyLeft")}><AlignLeft size={16}/></button>
      <button type="button" title="Centralizar" onClick={()=>command("justifyCenter")}><AlignCenter size={16}/></button>
      <button type="button" title="Alinhar à direita" onClick={()=>command("justifyRight")}><AlignRight size={16}/></button>
      <button type="button" title="Inserir link" onClick={()=>{const url=window.prompt("Cole o endereço do link:");if(url)command("createLink",url);}}><span className="editor-link">Link</span></button>
      <button type="button" title="Inserir imagem" disabled={uploading} onClick={()=>file.current?.click()}><ImageIcon size={16}/></button>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async e=>{try{await insertImage(e.target.files?.[0],supabase,profile);}catch(err){window.alert(err.message);}finally{e.target.value="";}}}/>
    </div>
    <div ref={editor} className="editor-content" contentEditable suppressContentEditableWarning data-placeholder="Compartilhe uma novidade, uma lembrança ou uma história com a comunidade..." />
    <div className="editor-footer"><small>{uploading?"Enviando imagem...":"Você pode formatar o texto e inserir imagens entre os parágrafos."}</small><div>{onCancel&&<button type="button" className="outline-btn" onClick={onCancel}>Cancelar</button>}<button className="primary-btn" disabled={busy||uploading}>{busy?"Salvando...":submitLabel}</button></div></div>
  </form>;
}

export default function CommunityPosts({supabase,profile,canModerate=false,onMessage=()=>{}}) {
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(null);
  const [comment,setComment]=useState("");
  const [busy,setBusy]=useState(false);
  const [editing,setEditing]=useState(null);
  const [composer,setComposer]=useState(false);
  async function refresh(){
    setLoading(true);
    const [p,r,c,m]=await Promise.all([
      supabase.from("community_posts").select("*").order("created_at",{ascending:false}),
      supabase.from("community_post_reactions").select("*"),
      supabase.from("community_post_comments").select("*").order("created_at"),
      supabase.from("profiles").select("id,display_name,username,avatar_url,role")
    ]);
    const error=p.error||r.error||c.error||m.error;
    if(error){onMessage(error.message);setLoading(false);return;}
    const people=new Map((m.data||[]).map(x=>[x.id,x]));
    const reactions=r.data||[],comments=c.data||[];
    setPosts((p.data||[]).map(post=>({...post,author:people.get(post.author_id),reactions:reactions.filter(x=>x.post_id===post.id),comments:comments.filter(x=>x.post_id===post.id).map(x=>({...x,author:people.get(x.author_id)}))})));
    setLoading(false);
  }
  useEffect(()=>{refresh();},[supabase]);
  const selectedPost=selected?posts.find(p=>p.id===selected):null;
  async function savePost(html,id=null){
    if(!html.replace(/<[^>]*>/g,"").trim() && !html.includes("<img")){onMessage("Escreva algo antes de publicar.");return;}
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
    if(!profile){onMessage("Entre no portal para reagir às publicações.");return;}
    const mine=post.reactions.find(r=>r.member_id===profile.id);
    const {error}=mine
      ? await supabase.from("community_post_reactions").delete().eq("id",mine.id)
      : await supabase.from("community_post_reactions").insert({post_id:post.id,member_id:profile.id,reaction:"heart"});
    if(error){onMessage(error.message);return;} await refresh();
  }
  async function sendComment(e){
    e.preventDefault();if(!profile){onMessage("Entre no portal para comentar.");return;}if(!selectedPost||!comment.trim())return;
    setBusy(true);
    const {error}=await supabase.from("community_post_comments").insert({post_id:selectedPost.id,author_id:profile.id,body:comment.trim()});
    setBusy(false);if(error){onMessage(error.message);return;}setComment("");await refresh();
  }
  async function removeComment(id){if(!window.confirm("Excluir este comentário?"))return;const {error}=await supabase.from("community_post_comments").delete().eq("id",id);if(error)onMessage(error.message);else await refresh();}
  async function removePost(id){if(!window.confirm("Excluir esta publicação e seus comentários?"))return;const {error}=await supabase.from("community_posts").delete().eq("id",id);if(error){onMessage(error.message);return;}setSelected(null);await refresh();onMessage("Publicação excluída.");}
  const canManage=(post)=>!!profile&&(post?.author_id===profile.id||canModerate);
  function authorLine(person){return <><span className="post-avatar">{person?.avatar_url?<img src={person.avatar_url}/>:person?.display_name?.slice(0,1)||"H"}</span><span><strong>{person?.display_name||"Aventureiro"}</strong><small>{person?.role==="founder"?"Fundador":person?.role==="staff"?"Staff":`@${person?.username||"membro"}`}</small></span></>;}
  function postActions(post){const mine=!!profile&&post.reactions.some(r=>r.member_id===profile.id);return <div className="post-actions"><button className={mine?"reacted":""} disabled={!profile} title={!profile?"Entre no portal para reagir":""} onClick={()=>toggleHeart(post)}><Heart size={17} fill={mine?"currentColor":"none"}/>{post.reactions.length||0} coração{post.reactions.length===1?"":"s"}</button><button onClick={()=>setSelected(post.id)}><MessageCircle size={17}/>{post.comments.length||0} comentário{post.comments.length===1?"":"s"}</button></div>;}
  return <section className="content community-content">
    <div className="community-heading"><div><span className="eyebrow">MURAL DOS AVENTUREIROS</span><h2>Comunidade</h2><p>Compartilhe suas histórias, imagens e momentos com todos.</p></div></div>
    {profile&&<div className="community-composer panel">
      {composer?<RichEditor supabase={supabase} profile={profile} onSave={html=>savePost(html)} onCancel={()=>setComposer(false)} busy={busy}/>:<button className="composer-trigger" onClick={()=>setComposer(true)}><span className="post-avatar">{profile.avatar_url?<img src={profile.avatar_url}/>:profile.display_name?.slice(0,1)||"H"}</span><span>O que você gostaria de compartilhar?</span><ImageIcon size={19}/></button>}
    </div>}
    {loading?<div className="empty-state">Carregando publicações...</div>:posts.length?posts.map(post=><article className="community-post panel" key={post.id}>
      <div className="post-header">{authorLine(post.author)}<time>{new Date(post.created_at).toLocaleString("pt-BR")}{post.updated_at!==post.created_at?" · editada":""}</time></div>
      {editing===post.id?<RichEditor initialHtml={post.body_html} profile={profile} supabase={supabase} onSave={html=>savePost(html,post.id)} onCancel={()=>setEditing(null)} busy={busy} submitLabel="Salvar edição"/>:<><div className="post-open-area" role="button" tabIndex={0} onClick={()=>setSelected(post.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setSelected(post.id);}}><div className="post-rich-content" dangerouslySetInnerHTML={{__html:cleanHtml(post.body_html)}}/><span className="post-read-more">Abrir publicação e comentários</span></div>{postActions(post)}</>}
      {canManage(post)&&<div className="post-management">{post.author_id===profile.id&&<button onClick={()=>setEditing(post.id)}><Pencil size={14}/>Editar</button>}<button onClick={()=>removePost(post.id)}><Trash2 size={14}/>Excluir</button></div>}
    </article>):<div className="empty-public"><div className="empty-public-icon"><Newspaper/></div><strong>O mural ainda está vazio</strong><span>Seja o primeiro a compartilhar uma história com os aventureiros!</span></div>}
    {selectedPost&&<div className="modal-backdrop post-modal-backdrop" onClick={()=>setSelected(null)}><section className="post-detail-modal" onClick={e=>e.stopPropagation()}>
      <button className="modal-close" onClick={()=>setSelected(null)}><X/></button>
      <div className="post-header">{authorLine(selectedPost.author)}<time>{new Date(selectedPost.created_at).toLocaleString("pt-BR")}</time></div>
      <div className="post-rich-content post-detail-body" dangerouslySetInnerHTML={{__html:cleanHtml(selectedPost.body_html)}}/>
      {postActions(selectedPost)}
      <div className="post-comments"><h3>Comentários ({selectedPost.comments.length})</h3>
        {selectedPost.comments.map(c=><div className="post-comment" key={c.id}><div className="post-header">{authorLine(c.author)}<time>{new Date(c.created_at).toLocaleString("pt-BR")}</time></div><p>{c.body}</p>{((profile&&c.author_id===profile.id)||canModerate)&&<button className="comment-delete" onClick={()=>removeComment(c.id)}><Trash2 size={13}/>Excluir</button>}</div>)}
        {profile?<form className="comment-form" onSubmit={sendComment}><input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Escreva um comentário..." maxLength={2000}/><button className="primary-btn" disabled={busy||!comment.trim()}><Send size={15}/>Enviar</button></form>:<p className="login-to-interact">Entre no portal para comentar e reagir.</p> }
      </div>
    </section></div>}
  </section>;
}
