import React from "react";
import { Search } from "lucide-react";
import { PublicMember } from "./PortalShared";

export default function MemberDirectory({ members, awards, search, onSearchChange, onBadge, onProfile }) {
 return <section className="content"><div className="panel"><div className="panel-heading"><div><h3>Quadro de aventureiros</h3><p>{members.length} membros aprovados.</p></div><div className="search-box"><Search/><input value={search} onChange={e=>onSearchChange(e.target.value)} placeholder="Buscar membro..."/></div></div><div className="member-grid">{members.map(m=><PublicMember key={m.id} member={m} awards={awards.filter(a=>a.member_id===m.id)} onBadge={onBadge} onProfile={onProfile}/>)}</div></div></section>;
}
