import React, { useEffect, useState } from "react";
import { Check, X, Pencil, Trash2, RefreshCw, ShieldCheck, Crown } from "lucide-react";
import { fetchRankPromotionSuggestions, fetchMemberExpHistory } from "../lib/founderAdminData";
import { saveStaffPermissions, saveCommunityRank, deleteCommunityRank, adjustMemberExp, scanRankPromotions, reviewRankPromotion, updateStaffRole } from "../lib/founderAdminActions";

const emptyRank={name:"",description:"",color:"#22C55E",sort_order:1,min_days:0,min_exp:0,active:true};
const defaultPermissions={approve_members:true,grant_badges:true,grant_exp:true,publish_news:true};

export default function FounderAdminPanel({supabase,members,ranks,staffPermissions,onRefresh,onMessage}) {
  const [permissions,setPermissions]=useState({...defaultPermissions,...(staffPermissions||{})});
  const [rank,setRank]=useState(emptyRank),[editingRank,setEditingRank]=useState(null);
  const [adjustMember,setAdjustMember]=useState(""),[adjustAmount,setAdjustAmount]=useState(-10),[adjustReason,setAdjustReason]=useState("");
  const [suggestions,setSuggestions]=useState([]),[expHistory,setExpHistory]=useState([]);
  const [busy,setBusy]=useState(false);

  useEffect(()=>setPermissions({...defaultPermissions,...(staffPermissions||{})}),[staffPermissions]);

  async function loadSuggestions(){
    try {
      setSuggestions(await fetchRankPromotionSuggestions(supabase));
    } catch (error) {
      onMessage(error.message);
    }
  }
  async function loadExpHistory(){
    try {
      setExpHistory(await fetchMemberExpHistory(supabase));
    } catch (error) {
      onMessage(error.message);
    }
  }
  useEffect(()=>{loadSuggestions();loadExpHistory()},[]);

  async function savePermissions(){
    setBusy(true);
    try {
      await saveStaffPermissions(supabase, permissions);
      onMessage("Permissões da Staff atualizadas.");
      onRefresh();
    } catch (error) {
      onMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveRank(e){
    e.preventDefault();
    setBusy(true);
    try {
      await saveCommunityRank(supabase, editingRank, rank);
      onMessage("Patente salva.");
      setRank(emptyRank);
      setEditingRank(null);
      onRefresh();
    } catch (error) {
      onMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteRank(id){
    if(!confirm("Excluir esta patente?"))return;
    try {
      await deleteCommunityRank(supabase, id);
      onMessage("Patente excluída.");
      onRefresh();
    } catch (error) {
      onMessage(error.message);
    }
  }
  async function adjustExp(e){
    e.preventDefault();
    setBusy(true);
    try {
      await adjustMemberExp(supabase, adjustMember, adjustAmount, adjustReason);
      onMessage("Ajuste de EXP registrado no histórico.");
      setAdjustReason("");
      await Promise.all([onRefresh(), loadExpHistory()]);
    } catch (error) {
      onMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function scanRanks(){
    setBusy(true);
    try {
      const count = await scanRankPromotions(supabase);
      onMessage("Verificação concluída: " + count + " nova(s) sugestão(ões).");
      loadSuggestions();
    } catch (error) {
      onMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function reviewSuggestion(id, approve){
    try {
      await reviewRankPromotion(supabase, id, approve);
      onMessage(approve ? "Promoção aprovada!" : "Sugestão recusada.");
      loadSuggestions();
      onRefresh();
    } catch (error) {
      onMessage(error.message);
    }
  }
  async function assignStaff(memberId, role){
    try {
      await updateStaffRole(supabase, memberId, role);
      onMessage(role === "staff" ? "Cargo Staff atribuído." : "Cargo Staff removido.");
      onRefresh();
    } catch (error) {
      onMessage(error.message);
    }
  }

  return <section className="content">
    <div className="panel"><div className="panel-heading"><div><h3>Permissões da Staff</h3><p>O Fundador escolhe exatamente o que a equipe pode fazer.</p></div><ShieldCheck/></div>
      {Object.entries({approve_members:"Aprovar e recusar novos membros",grant_badges:"Conceder e retirar badges",grant_exp:"Conceder EXP aos membros",publish_news:"Criar, editar e publicar notícias"}).map(([key,label])=><label className="permission-option" key={key}><input type="checkbox" checked={!!permissions[key]} onChange={e=>setPermissions({...permissions,[key]:e.target.checked})}/><span>{label}</span></label>)}
      <button className="primary-btn" disabled={busy} onClick={savePermissions}>Salvar permissões</button>
    </div>

    <div className="panel"><div className="panel-heading"><div><h3>{editingRank?"Editar patente":"Criar patente"}</h3><p>EXP é o critério principal; tempo de casa pode complementar. Toda promoção depende da aprovação do Fundador.</p></div><Crown/></div>
      <form className="badge-form" onSubmit={saveRank}>
        <label>Nome<input required minLength="2" maxLength="40" value={rank.name} onChange={e=>setRank({...rank,name:e.target.value})}/></label>
        <label>Descrição<input maxLength="180" value={rank.description} onChange={e=>setRank({...rank,description:e.target.value})}/></label>
        <div className="rank-fields"><label>Cor<input type="color" value={rank.color} onChange={e=>setRank({...rank,color:e.target.value})}/></label><label>Ordem<input type="number" min="1" value={rank.sort_order} onChange={e=>setRank({...rank,sort_order:e.target.value})}/></label><label>Dias mínimos<input type="number" min="0" value={rank.min_days} onChange={e=>setRank({...rank,min_days:e.target.value})}/></label><label>EXP mínimo<input type="number" min="0" value={rank.min_exp} onChange={e=>setRank({...rank,min_exp:e.target.value})}/></label></div>
        <label className="permission-option"><input type="checkbox" checked={rank.active} onChange={e=>setRank({...rank,active:e.target.checked})}/> Patente ativa</label>
        <div className="form-actions"><button className="primary-btn" disabled={busy}>{editingRank?"Salvar patente":"Criar patente"}</button>{editingRank&&<button type="button" className="outline-btn" onClick={()=>{setEditingRank(null);setRank(emptyRank)}}>Cancelar</button>}</div>
      </form>
      <div className="admin-badge-list">{ranks.map(r=><div className="admin-badge-row" key={r.id}><span className="rank-color-dot" style={{background:r.color}}/><div><strong style={{color:r.color}}>{r.name}</strong><span>#{r.sort_order} · {r.min_days} dias · {r.min_exp} EXP {r.active?"· Ativa":"· Inativa"}</span><p>{r.description}</p></div><button className="icon-btn" onClick={()=>{setEditingRank(r);setRank({...r})}}><Pencil/></button><button className="icon-btn danger" onClick={()=>deleteRank(r.id)}><Trash2/></button></div>)}</div>
    </div>

    <div className="panel"><div className="panel-heading"><div><h3>Promoções sugeridas</h3><p>EXP + tempo mínimo (se configurado). Toda promoção precisa da sua aprovação.</p></div><button className="subtle-btn" onClick={scanRanks} disabled={busy}><RefreshCw size={15}/> Verificar</button></div>
      {suggestions.length?suggestions.map(s=><div className="approval-row" key={s.id}><div className="member-info"><strong>{s.profiles?.display_name||"Membro"} → <span style={{color:s.community_ranks?.color}}>{s.community_ranks?.name}</span></strong><span>@{s.profiles?.username} · requisito: {Number(s.community_ranks?.min_exp||0).toLocaleString("pt-BR")} EXP</span></div><div className="row-actions"><button className="approve-btn" onClick={()=>reviewSuggestion(s.id,true)}><Check/>Aprovar</button><button className="reject-btn" onClick={()=>reviewSuggestion(s.id,false)}><X/>Recusar</button></div></div>):<p className="empty-copy">Nenhuma promoção aguardando análise.</p>}
    </div>

    <div className="panel"><div className="panel-heading"><div><h3>Corrigir EXP</h3><p>Apenas o Fundador pode lançar ajustes positivos ou negativos, sempre com justificativa.</p></div><ShieldCheck/></div>
      <form className="grant-form" onSubmit={adjustExp}><label>Membro<select required value={adjustMember} onChange={e=>setAdjustMember(e.target.value)}><option value="">Selecione</option>{members.filter(m=>m.status==="approved").map(m=><option key={m.id} value={m.id}>{m.display_name}</option>)}</select></label><label>Ajuste (+ ou −)<input type="number" min="-100000" max="100000" required value={adjustAmount} onChange={e=>setAdjustAmount(e.target.value)}/></label><label>Motivo<input required minLength="3" maxLength="180" value={adjustReason} onChange={e=>setAdjustReason(e.target.value)} placeholder="Ex.: correção de lançamento duplicado"/></label><button className="primary-btn" disabled={busy||!adjustMember||Number(adjustAmount)===0}>Registrar ajuste</button></form>
    </div>

    <div className="panel"><div className="panel-heading"><div><h3>Histórico de EXP</h3><p>Últimos 40 lançamentos, incluindo EXP de badges e concessões manuais.</p></div><button className="subtle-btn" onClick={loadExpHistory}><RefreshCw size={15}/> Atualizar</button></div>
      {expHistory.length?expHistory.map(item=><div className="admin-badge-row" key={item.id}><div><strong>{item.profiles?.display_name||"Membro"} · {item.amount>0?"+":""}{item.amount} EXP</strong><span>{item.reason} · {new Date(item.created_at).toLocaleString("pt-BR")}</span></div></div>):<p className="empty-copy">Nenhum lançamento de EXP ainda.</p>}
    </div>

    <div className="panel"><div className="panel-heading"><div><h3>Equipe Staff</h3><p>Escolha membros aprovados para receber o cargo administrativo Staff.</p></div></div>{members.filter(m=>m.status==="approved"&&m.role!=="founder").map(m=><div className="approval-row" key={m.id}><div className="member-info"><strong>{m.display_name}</strong><span>@{m.username} · {m.role==="staff"?"Staff":m.role}</span></div>{m.role==="staff"?<button className="reject-btn" onClick={()=>assignStaff(m.id,"member")}>Remover Staff</button>:<button className="approve-btn" onClick={()=>assignStaff(m.id,"staff")}>Tornar Staff</button>}</div>)}</div>
  </section>;
}
