import React, { useState } from "react";
import { Pencil, Trash2, Newspaper } from "lucide-react";
import RichTextEditor from "../RichTextEditor";
import { resolveNewsPublishedAt } from "../lib/newsSchedule";

const emptyNews={title:"",summary:"",body:"",scheduledAt:""};
const toLocalDateTime=(value)=>{
  if(!value)return "";
  const date=new Date(value);
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
};

export default function NewsAdminPanel({supabase,profile,newsPosts,onRefresh,onMessage}) {
  const [news,setNews]=useState(emptyNews);
  const [editingNews,setEditingNews]=useState(null);
  const [busy,setBusy]=useState(false);

  async function saveNews(bodyHtml){
    if(news.title.trim().length<3){onMessage("Informe um título com pelo menos 3 caracteres.");return;}
    if(!bodyHtml.replace(/<[^>]*>/g,"").trim()&&!bodyHtml.includes("<img")){onMessage("Escreva o conteúdo da notícia ou insira uma imagem.");return;}
    const scheduledAt=news.scheduledAt?new Date(news.scheduledAt).toISOString():null;
    const willSchedule=scheduledAt&&new Date(scheduledAt)>new Date();
    const publishedAt=resolveNewsPublishedAt(scheduledAt,editingNews);
    setBusy(true);
    const {error}=await supabase.rpc("admin_save_news",{
      p_news_id:editingNews?.id||null,
      p_title:news.title,
      p_summary:news.summary,
      p_body:bodyHtml,
      p_cover_image_url:editingNews?.cover_image_url||null,
      p_status:"published",
      p_published_at:publishedAt
    });
    setBusy(false);
    if(error){onMessage(error.message);return;}
    onMessage(willSchedule?"Notícia agendada! Ela ficará visível na data programada.":"Notícia publicada!");
    setNews(emptyNews);setEditingNews(null);onRefresh();
  }

  async function deleteNews(id){
    if(!confirm("Excluir esta notícia?"))return;
    const {error}=await supabase.rpc("admin_delete_news",{p_news_id:id});
    onMessage(error?.message||"Notícia excluída.");
    if(!error)onRefresh();
  }

  return <section className="content">
    <div className="panel"><div className="panel-heading"><div><h3>{editingNews?"Editar notícia":"Nova notícia"}</h3><p>Monte uma notícia completa com formatação, imagens no meio do texto, links e listas.</p></div><Newspaper/></div>
      <div className="badge-form">
        <label>Título<input required minLength="3" maxLength="100" value={news.title} onChange={e=>setNews({...news,title:e.target.value})} placeholder="Título da notícia"/></label>
        <label>Resumo<textarea rows="2" maxLength="240" value={news.summary} onChange={e=>setNews({...news,summary:e.target.value})} placeholder="Uma breve chamada para a notícia"/></label>
        <label>Data e hora da publicação (opcional)<input type="datetime-local" value={news.scheduledAt} onChange={e=>setNews({...news,scheduledAt:e.target.value})}/></label>
        <small>Deixe em branco para publicar imediatamente. Se escolher uma data futura, a notícia será exibida automaticamente quando chegar o horário.</small>
        <RichTextEditor key={editingNews?.id||"new-news"} initialHtml={news.body} supabase={supabase} profile={profile} onSave={saveNews} busy={busy} submitLabel={news.scheduledAt&&new Date(news.scheduledAt)>new Date()?"Agendar notícia":"Publicar notícia"}/>
        {editingNews&&<button type="button" className="outline-btn" onClick={()=>{setEditingNews(null);setNews(emptyNews)}}>Cancelar edição</button>}
      </div>
    </div>
    <div className="panel"><h3>Notícias e agendamentos ({newsPosts.length})</h3>{newsPosts.map(n=>{
      const scheduled=n.status==="published"&&n.published_at&&new Date(n.published_at)>new Date();
      return <div className="admin-badge-row" key={n.id}><div><strong>{n.title}</strong><span>{scheduled?"Agendada para "+new Date(n.published_at).toLocaleString("pt-BR"):n.status==="published"?"Publicada":"Rascunho"} · {new Date(n.updated_at).toLocaleDateString("pt-BR")}</span><p>{n.summary}</p></div><button className="icon-btn" onClick={()=>{setEditingNews(n);setNews({title:n.title,summary:n.summary||"",body:n.body||"",scheduledAt:scheduled?toLocalDateTime(n.published_at):""})}}><Pencil/></button><button className="icon-btn danger" onClick={()=>deleteNews(n.id)}><Trash2/></button></div>;
    })}</div>
  </section>;
}
