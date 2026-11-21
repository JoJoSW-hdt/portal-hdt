import React from "react";
import { PublicMember } from "./PortalShared";

export default function PublicMemberDirectory({ members, awards, search, onSearchChange, onBadge, onProfile }) {
  return <>
    <div className="public-section-head">
      <div>
        <span className="eyebrow">QUADRO DE AVENTUREIROS</span>
        <h2>Nossos membros</h2>
      </div>
      <input className="public-search" placeholder="Buscar membro..." value={search} onChange={e => onSearchChange(e.target.value)} />
    </div>
    <div className="public-members">
      {members.map(m => <PublicMember key={m.id} member={m} awards={awards.filter(a => a.member_id === m.id)} onBadge={onBadge} onProfile={onProfile} />)}
    </div>
  </>;
}
