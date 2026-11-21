import { CalendarDays } from "lucide-react";
import { EventCard } from "./PortalShared";

export default function PublicEventsPage({ events }) {
  const published = events.filter(e => e.status === "published");

  return <>
    <div className="public-section-head">
      <div>
        <span className="eyebrow">AGENDA</span>
        <h2>Eventos</h2>
        <p>Fique de olho nas próximas atividades da comunidade.</p>
      </div>
    </div>
    {published.length ? <div className="events-grid">
      {published.map(e => <EventCard key={e.id} event={e}/>)}
    </div> : <div className="empty-public">
      <div className="empty-public-icon"><CalendarDays size={25}/></div>
      <strong>Nenhum evento cadastrado</strong>
      <span>Os próximos encontros e atividades serão divulgados aqui.</span>
    </div>}
  </>;
}
