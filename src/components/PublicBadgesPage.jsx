import React from "react";
import { BadgeCatalog } from "./PortalShared";

export default function PublicBadgesPage({ badges }) {
  return <>
    <div className="public-section-head">
      <div>
        <span className="eyebrow">GALERIA DE HONRARIAS</span>
        <h2>Catálogo de badges</h2>
        <p>Distintivos especiais concedidos pela administração.</p>
      </div>
    </div>
    <BadgeCatalog badges={badges}/>
  </>;
}
