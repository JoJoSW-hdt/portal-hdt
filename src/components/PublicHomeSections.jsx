import React from "react";
import { Leaf, CalendarDays } from "lucide-react";
import { cleanHtml } from "../RichTextEditor";
import { EventCard, PublicMember, BadgeCatalog } from "./PortalShared";
import { getUpcomingEvents } from "../lib/eventSchedule";

export default function PublicHomeSections({ newsPosts, events, members, awards, badges, onNews, onEvents, onMembers, onBadges, onBadge, onProfile }) {
  const publishedNews = newsPosts.filter(n => n.status === "published" && (!n.published_at || new Date(n.published_at) <= new Date()));
  const publishedEvents = getUpcomingEvents(events);
  const approvedMembers = members.filter(m => m.status === "approved");

  return <>
    <div className="public-section-head"><div><span className="eyebrow">FIQUE POR DENTRO</span><h2>Últimas notícias</h2><p>Novidades, anúncios e histórias da comunidade.</p></div><button className="link-btn" onClick={onNews}>Ver notícias →</button></div>
    {publishedNews.length ? <div className="news-grid">{publishedNews.slice(0,3).map(n=><article className="news-card" key={n.id}><span className="eyebrow">{n.published_at?new Date(n.published_at).toLocaleDateString("pt-BR"):"COMUNIDADE"}</span><h3>{n.title}</h3>{n.summary&&<p>{n.summary}</p>}<div className="post-rich-content" dangerouslySetInnerHTML={{__html:cleanHtml(n.body||"")}}/></article>)}</div> : <div className="empty-public"><div className="empty-public-icon"><Leaf size={25}/></div><strong>As notícias estão a caminho!</strong><span>Assim que a equipe publicar novidades, elas aparecerão por aqui.</span></div>}
    <div className="public-section-head"><div><span className="eyebrow">AGENDA DA COMUNIDADE</span><h2>Próximos eventos</h2><p>Encontros, atividades e jornadas especiais.</p></div><button className="link-btn" onClick={onEvents}>Ver agenda →</button></div>
    {publishedEvents.length ? <div className="events-grid">{publishedEvents.slice(0,3).map(e=><EventCard key={e.id} event={e}/>)}</div> : <div className="empty-public"><div className="empty-public-icon"><CalendarDays size={25}/></div><strong>Nenhum evento anunciado por enquanto</strong><span>Volte em breve para descobrir os próximos encontros.</span></div>}
    <div className="public-section-head"><div><span className="eyebrow">A NOSSA COMUNIDADE</span><h2>Aventureiros em destaque</h2></div><button className="link-btn" onClick={onMembers}>Ver todos <span>→</span></button></div>
    <div className="public-members">{approvedMembers.slice(0,4).map(m=><PublicMember key={m.id} member={m} awards={awards.filter(a=>a.member_id===m.id)} onBadge={onBadge} onProfile={onProfile}/>)}</div>
    <div className="public-section-head"><div><span className="eyebrow">COLECIONE CONQUISTAS</span><h2>Distintivos do portal</h2></div><button className="link-btn" onClick={onBadges}>Ver coleção →</button></div>
    <BadgeCatalog badges={badges.slice(0,6)}/>
  </>;
}
