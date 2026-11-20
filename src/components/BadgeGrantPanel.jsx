import React from "react";

export default function BadgeGrantPanel({ members, badges, awards, rarityNames, grantMember, grantBadge, onMemberChange, onBadgeChange, onGrant, onRevoke }) {
  return (
    <section className="content">
      <div className="panel">
        <div className="panel-heading"><div><h3>Conceder uma conquista</h3><p>Escolha um membro e uma badge do catálogo.</p></div></div>
        <div className="grant-form">
          <label>Membro<select value={grantMember} onChange={e=>onMemberChange(e.target.value)}><option value="">Selecione um membro</option>{members.map(m=><option key={m.id} value={m.id}>{m.display_name} (@{m.username})</option>)}</select></label>
          <label>Badge<select value={grantBadge} onChange={e=>onBadgeChange(e.target.value)}><option value="">Selecione uma badge</option>{badges.map(b=><option key={b.id} value={b.id}>{b.name} · {rarityNames[b.rarity]}</option>)}</select></label>
          <button className="primary-btn" disabled={!grantMember||!grantBadge} onClick={onGrant}>Conceder badge</button>
        </div>
      </div>
      <div className="panel">
        <h3>Conquistas concedidas</h3>
        {awards.map(a=><div className="admin-badge-row" key={a.id}><img src={a.badges?.image_url}/><div><strong>{a.badges?.name}</strong><span>{members.find(m=>m.id===a.member_id)?.display_name||"Membro"} · {new Date(a.granted_at).toLocaleDateString("pt-BR")}</span></div><button className="reject-btn" onClick={()=>onRevoke(a.id)}>Retirar</button></div>)}
      </div>
    </section>
  );
}
