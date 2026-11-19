import React, { useEffect, useState } from "react";
import { Check, X, Pencil, Trash2, Plus, RefreshCw, ShieldCheck, Newspaper, Crown, Award } from "lucide-react";

const emptyRank={name:"",description:"",color:"#22C55E",sort_order:1,min_days:0,min_points:0,active:true};
export default function AdminTools({mode,supabase,profile,members,ranks,newsPosts,staffPermissions,onRefresh,onMessage}) {
  const [permissions,setPermissions]=useState(staffPermissions||{approve_members:true,grant_badges:true,publish_news:true});
  const [rank,setRank]=useState(emptyRank),[editingRank,setEditingRank]=useState(null);
  const [pointMember,setPointMember]=useState(""),[points,setPoints]=useState(10),[reason,setReason]=useState("");
  const [suggestions,setSuggestions]=useState([]);
  const [news,setNews]=useState({title:"",summary:"",body:"",status:"draft"}),[editingNews,setEditingNews]=useState(null);
  const [busy,setBusy]=useState(false);
  useEffect(()=>setPermissions(staffPermissions||{approve_members:true,grant_badges:true,publish_news:true}),[staffPermissions]);
  async function loadSuggestions(){
    const {data,error}=await supabase.from("rank_promotion_requests")
      .select("*,profiles!rank_promotion_requests_member_id_fkey(display_name,username,activity_points,created_at),community_ranks!rank_promotion_requests_suggested_rank_id_fkey(name,color)")
      .eq("status","pending").order("created_at",{ascending:false});
    if(error)onMessage(error.message); else setSuggestions(data||[]);
  }
  useEffect(()=>{if(mode==="founder")loadSuggestions()},[mode]);
  async function savePermissions(){
    setBusy(true);const {error}=await supabase.rpc("admin_update_staff_permissions",{p_permissions:permissions});setBusy(false);
    onMessage(error?.message||"Permissões da Staff atualizadas.");if(!error)onRefresh();
  }
  async function saveRank(e){
    e.preventDefault();setBusy(true);
    const {error}=await supabase.rpc("admin_save_community_rank",{
      p_rank_id:editingRank?.id||null,p_name:rank.name,p_description:rank.description,p_color:rank.color,
      p_sort_order:Number(rank.sort_order),p_min_days:Number(rank.min_days),p_min_points:Number(rank.min_points),p_active:rank.active
    });
    setBusy(false);if(error){onMessage(error.message);return}
    onMessage("Patente salva.");setRank(emptyRank);setEditingRank(null);onRefresh();
  }
  async function deleteRank(id){if(!confirm("Excluir esta patente?"))return;const {error}=await supabase.rpc("admin_delete_community_rank",{p_rank_id:id});onMessage(error?.message||"Patente excluída.");if(!error)onRefresh()}
  async function addPoints(e){
    e.preventDefault();setBusy(true);const {error}=await supabase.rpc("admin_add_activity_points",{p_member_id:pointMember,p_points:Number(points),p_reason:reason});setBusy(false);
    onMessage(error?.message||"Participação registrada.");if(!error){setReason("");onRefresh()}
  }
  async function scanRanks(){setBusy(true);const {data,error}=await supabase.rpc("admin_scan_rank_promotions");setBusy(false);onMessage(error?.message||`Verificação concluída: ${data||0} nova(s) sugestão(ões).`);if(!error)loadSuggestions()}
  async function reviewSuggestion(id,approve){const {error}=await supabase.rpc("admin_review_rank_promotion",{p_request_id:id,p_approve:approve});onMessage(error?.message||(approve?"Promoção aprovada!":"Sugestão recusada."));if(!error){loadSuggestions();onRefresh()}}
  async function assignStaff(memberId,role){const {error}=await supabase.rpc("admin_update_member",{p_member_id:memberId,p_status:null,p_role:role});onMessage(error?.message||(role==="staff"?"Cargo Staff atribuído.":"Cargo Staff removido."));if(!error)onRefresh()}
  async function saveNews(e){
    e.preventDefault();setBusy(true);const {error}=await supabase.rpc("admin_save_news",{
      p_news_id:editingNews?.id||null,p_title:news.title,p_summary:news.summary,p_body:news.body,p_cover_image_url:editingNews?.cover_image_url||null,p_status:news.status
    });setBusy(false);if(error){onMessage(error.message);return}
    onMessage(news.status==="published"?"Notícia publicada!":"Rascunho salvo.");setNews({title:"",summary:"",body:"",status:"draft"});setEditingNews(null);onRefresh();
  }
  async function deleteNews(id){if(!confirm("Excluir esta notícia?"))return;const {error}=await supabase.rpc("admin_delete_news",{p_news_id:id});onMessage(error?.message||"Notícia excluída.");if(!error)onRefresh()}
  if(mode==="news")return <section className="content">
    <div className="panel"><div className="panel-heading"><div><h3>{editingNews?"Editar notícia":"Nova notícia"}</h3><p>Crie comunicados e novidades para toda a comunidade.</p></div><Newspaper/></div>
      <form className="badge-form" onSubmit={saveNews}>
        <label>Título<input required minLength="3" maxLength="100" value={news.title} onChange={e=>setNews({...news,title:e.target.value})} placeholder="Título da notícia"/></label>
        <label>Resumo<textarea rows="2" maxLength="240" value={news.summary} onChange={e=>setNews({...news,summary:e.target.value})} placeholder="Uma breve chamada para a notícia"/></label>
        <label>Conteúdo<textarea rows="8" value={news.body} onChange={e=>setNews({...news,body:e.target.value})} placeholder="Escreva a notícia..."/></label>
        <label>Publicação<select value={news.status} onChange={e=>setNews({...news,status:e.target.value})}><option value="draft">Salvar como rascunho</option><option value="published">Publicar agora</option></select></label>
        <div className="form-actions"><button className="primary-btn" disabled={busy}>{busy?"Salvando...":editingNews?"Salvar alterações":"Salvar notícia"}</button>{editingNews&&<button type="button" className="outline-btn" onClick={()=>{setEditingNews(null);setNews({title:"",summary:"",body:"",status:"draft"})}}>Cancelar</button>}</div>
      </form>
    </div>
    <div className="panel"><h3>Notícias e rascunhos ({newsPosts.length})</h3>{newsPosts.map(n=><div className="admin-badge-row" key={n.id}><div><strong>{n.title}</strong><span>{n.status==="published"?"Publicada":"Rascunho"} · {new Date(n.updated_at).toLocaleDateString("pt-BR")}</span><p>{n.summary}</p></div><button className="icon-btn" onClick={()=>{setEditingNews(n);setNews({title:n.title,summary:n.summary||"",body:n.body||"",status:n.status})}}><Pencil/></button><button className="icon-btn danger" onClick={()=>deleteNews(n.id)}><Trash2/></button></div>)}</div>
  </section>;
  return <section className="content">
    <div className="panel"><div className="panel-heading"><div><h3>Permissões da Staff</h3><p>O Fundador escolhe exatamente o que a equipe pode fazer.</p></div><ShieldCheck/></div>
      {Object.entries({approve_members:"Aprovar e recusar novos membros",grant_badges:"Conceder e retirar badges",publish_news:"Criar, editar e publicar notícias"}).map(([key,label])=><label className="permission-option" key={key}><input type="checkbox" checked={!!permissions[key]} onChange={e=>setPermissions({...permissions,[key]:e.target.checked})}/><span>{label}</span></label>)}
      <button className="primary-btn" disabled={busy} onClick={savePermissions}>Salvar permissões</button>
    </div>
    <div className="panel"><div className="panel-heading"><div><h3>{editingRank?"Editar patente":"Criar patente"}</h3><p>Nome, cor e critérios de evolução são definidos pelo Fundador.</p></div><Crown/></div>
      <form className="badge-form" onSubmit={saveRank}>
        <label>Nome<input required minLength="2" maxLength="40" value={rank.name} onChange={e=>setRank({...rank,name:e.target.value})}/></label>
        <label>Descrição<input maxLength="180" value={rank.description} onChange={e=>setRank({...rank,description:e.target.value})}/></label>
        <div className="rank-fields"><label>Cor<input type="color" value={rank.color} onChange={e=>setRank({...rank,color:e.target.value})}/></label><label>Ordem<input type="number" min="1" value={rank.sort_order} onChange={e=>setRank({...rank,sort_order:e.target.value})}/></label><label>Dias mínimos<input type="number" min="0" value={rank.min_days} onChange={e=>setRank({...rank,min_days:e.target.value})}/></label><label>Pontos mínimos<input type="number" min="0" value={rank.min_points} onChange={e=>setRank({...rank,min_points:e.target.value})}/></label></div>
        <label className="permission-option"><input type="checkbox" checked={rank.active} onChange={e=>setRank({...rank,active:e.target.checked})}/> Patente ativa</label>
        <div className="form-actions"><button className="primary-btn" disabled={busy}>{editingRank?"Salvar patente":"Criar patente"}</button>{editingRank&&<button type="button" className="outline-btn" onClick={()=>{setEditingRank(null);setRank(emptyRank)}}>Cancelar</button>}</div>
      </form>
      <div className="admin-badge-list">{ranks.map(r=><div className="admin-badge-row" key={r.id}><span className="rank-color-dot" style={{background:r.color}}/><div><strong style={{color:r.color}}>{r.name}</strong><span>#{r.sort_order} · {r.min_days} dias · {r.min_points} pontos {r.active?"· Ativa":"· Inativa"}</span><p>{r.description}</p></div><button className="icon-btn" onClick={()=>{setEditingRank(r);setRank({...r})}}><Pencil/></button><button className="icon-btn danger" onClick={()=>deleteRank(r.id)}><Trash2/></button></div>)}</div>
    </div>
    <div className="panel"><div className="panel-heading"><div><h3>Registrar participação</h3><p>Registre contribuições que contam para a próxima patente.</p></div><Award/></div>
      <form className="grant-form" onSubmit={addPoints}><label>Membro<select required value={pointMember} onChange={e=>setPointMember(e.target.value)}><option value="">Selecione</option>{members.filter(m=>m.status==="approved").map(m=><option key={m.id} value={m.id}>{m.display_name}</option>)}</select></label><label>Pontos<input type="number" min="1" max="100" value={points} onChange={e=>setPoints(e.target.value)}/></label><label>Motivo<input required minLength="3" maxLength="180" value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="primary-btn" disabled={busy||!pointMember}>Registrar</button></form>
    </div>
    <div className="panel"><div className="panel-heading"><div><h3>Promoções sugeridas</h3><p>Tempo de casa + pontos de participação. Toda promoção precisa da sua aprovação.</p></div><button className="subtle-btn" onClick={scanRanks} disabled={busy}><RefreshCw size={15}/> Verificar</button></div>
      {suggestions.length?suggestions.map(s=><div className="approval-row" key={s.id}><div className="member-info"><strong>{s.profiles?.display_name||"Membro"} → <span style={{color:s.community_ranks?.color}}>{s.community_ranks?.name}</span></strong><span>@{s.profiles?.username} · {s.profiles?.activity_points||0} pontos</span></div><div className="row-actions"><button className="approve-btn" onClick={()=>reviewSuggestion(s.id,true)}><Check/>Aprovar</button><button className="reject-btn" onClick={()=>reviewSuggestion(s.id,false)}><X/>Recusar</button></div></div>):<p className="empty-copy">Nenhuma promoção aguardando análise.</p>}
    </div>
    <div className="panel"><div className="panel-heading"><div><h3>Equipe Staff</h3><p>Escolha membros aprovados para receber o cargo administrativo Staff.</p></div></div>{members.filter(m=>m.status==="approved").map(m=><div className="approval-row" key={m.id}><div className="member-info"><strong>{m.display_name}</strong><span>@{m.username} · {m.role==="staff"?"Staff":m.role}</span></div>{m.role==="staff"?<button className="reject-btn" onClick={()=>assignStaff(m.id,"member")}>Remover Staff</button>:<button className="approve-btn" onClick={()=>assignStaff(m.id,"staff")}>Tornar Staff</button>}</div>)}</div>
  </section>;
}
