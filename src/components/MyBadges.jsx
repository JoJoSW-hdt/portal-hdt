import React from "react";
import { BadgeTile } from "./PortalShared";

export default function MyBadges({ awards, onBadge }) {
  return (
    <div className="panel">
      <h3>Minhas badges</h3>
      <p className="muted">Conquistas concedidas pela administração.</p>
      <div className="badge-grid">
        {awards.map(award => <BadgeTile key={award.id} award={award} onClick={onBadge} />)}
      </div>
      {!awards.length && <p className="empty-copy">Sua coleção ainda está começando. Continue participando da comunidade!</p>}
    </div>
  );
}
