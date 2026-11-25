import React, { useState } from "react";
import RichTextEditor from "../RichTextEditor";
import { Newspaper, Pencil, Trash2 } from "lucide-react";

const emptyEvent={title:"",summary:"",starts_at:"",ends_at:"",location:"",event_type:"Encontro",description_html:"",has_badge_reward:false,reward_badge_id:"",reward_description:"",status:"published"};
const toLocalDateTime=(value)=>{if(!value)return "";const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};

export default function EventAdminPanel({supabase,profile,events=[],badges=[],onRefresh,onMessage}) {
  const [event,setEvent]=useState(emptyEvent),[editingEvent,setEditingEvent]=useState(null);
  const [busy,setBusy]=useState(false);

  async function saveEvent(descriptionHtml){
    if(event.title.trim().length<3){onMessage("Informe o nome do evento.");return;}
    if(!event.starts_at){onMessage("Informe a data e o horário de início.");return;}
    if(event.ends_at&&new Date(event.ends_at)<new Date(event.starts_at)){onMessage("O término não pode ser anterior ao início.");return;}
    if(!descriptionHtml.replace(/<[^>]*>/g,"").trim()&&!descriptionHtml.includes("<img")){onMessage("Adicione a descrição do evento ou uma imagem.");return;}
    setBusy(true);
    const {error}=await supabase.rpc("admin_save_event",{
      p_event_id:editingEvent?.id||null,p_title:event.title,p_summary:event.summary,p_starts_at:new Date(event.starts_at).toISOString(),
      p_ends_at:event.ends_at?new Date(event.ends_at).toISOString():null,p_location:event.location,p_event_type:event.event_type,
      p_description_html:descriptionHtml,p_has_badge_reward:event.has_badge_reward,p_reward_badge_id:event.has_badge_reward?(event.reward_badge_id||null):null,
      p_reward_description:event.has_badge_reward?event.reward_description:"",p_status:event.status
    });
    setBusy(false);if(error){onMessage(error.message);return}
    onMessage(event.status==="draft"?"Rascunho salvo!":"Evento publicado!");
    setEvent(emptyEvent);setEditingEvent(null);onRefresh();
  }
  async function deleteEvent(id){if(!confirm("Excluir este evento?"))return;const {error}=await supabase.rpc("admin_delete_event",{p_event_id:id});onMessage(error?.message||"Evento excluído.");if(!error)onRefresh()}

  return <section className="content">
    <div className="panel"><div className="panel-heading"><div><h3>{editingEvent?"Editar evento":"Criar evento"}</h3><p>Organize um encontro completo para a comunidade. Eventos podem ficar como rascunho até a divulgação.</p></div><Newspaper/></div>
      <div className="badge-form event-form">
        <label>Nome do evento<input required minLength="3" maxLength="120" value={event.title} onChange={e=>setEvent({...event,title:e.target.value})} placeholder="Ex.: Torneio de Power Bomberman"/></label>
        <label>Chamada / resumo<textarea rows="2" maxLength="300" value={event.summary} onChange={e=>setEvent({...event,summary:e.target.value})} placeholder="Uma frase para apresentar o evento"/></label>
        <div className="event-fields">
          <label>Tipo de evento<select value={event.event_type} onChange={e=>setEvent({...event,event_type:e.target.value})}><option>Encontro</option><option>Torneio</option><option>Live</option><option>Competição</option><option>Especial</option><option>Outro</option></select></label>
          <label>Data e horário de início<input type="datetime-local" required value={event.starts_at} onChange={e=>setEvent({...event,starts_at:e.target.value})}/></label>
          <label>Data e horário de término<input type="datetime-local" value={event.ends_at} onChange={e=>setEvent({...event,ends_at:e.target.value})}/></label>
          <label>Status<select value={event.status} onChange={e=>setEvent({...event,status:e.target.value})}><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label>
          <label>Local / plataforma<input maxLength="160" value={event.location} onChange={e=>setEvent({...event,location:e.target.value})} placeholder="Discord, Twitch, jogo/servidor ou endereço"/></label>
        </div>
        <label>Descrição completa</label>
        <RichTextEditor key={editingEvent?.id||"new-event"} initialHtml={event.description_html} supabase={supabase} profile={profile} onSave={saveEvent} busy={busy} submitLabel={event.status==="draft"?"Salvar rascunho":editingEvent?"Salvar alterações":"Publicar evento"}/>
        <label className="permission-option"><input type="checkbox" checked={event.has_badge_reward} onChange={e=>setEvent({...event,has_badge_reward:e.target.checked,reward_badge_id:e.target.checked?event.reward_badge_id:""})}/> Este evento terá uma badge como premiação</label>
        {event.has_badge_reward&&<div className="event-fields"><label>Badge da premiação<select value={event.reward_badge_id} onChange={e=>setEvent({...event,reward_badge_id:e.target.value})}><option value="">Definir depois / não vinculada</option>{badges.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Detalhes da premiação<input maxLength="240" value={event.reward_description} onChange={e=>setEvent({...event,reward_description:e.target.value})} placeholder="Quem recebe, critérios, quantidade..."/></label></div>}
        {editingEvent&&<button type="button" className="outline-btn" onClick={()=>{setEditingEvent(null);setEvent(emptyEvent)}}>Cancelar edição</button>}
      </div>
    </div>
    <div className="panel"><h3>Eventos cadastrados ({events.length})</h3>{events.map(item=><div className="admin-badge-row" key={item.id}><div><strong>{item.title}</strong><span>{item.status==="published"?"Publicado":"Rascunho"} · {new Date(item.starts_at).toLocaleString("pt-BR")}</span><p>{item.summary}</p></div><button className="icon-btn" onClick={()=>{setEditingEvent(item);setEvent({...emptyEvent,...item,starts_at:item.starts_at?toLocalDateTime(item.starts_at):"",ends_at:item.ends_at?toLocalDateTime(item.ends_at):""})}}><Pencil/></button><button className="icon-btn danger" onClick={()=>deleteEvent(item.id)}><Trash2/></button></div>)}</div>
  </section>;
}
