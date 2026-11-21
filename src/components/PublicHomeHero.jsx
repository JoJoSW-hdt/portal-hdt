import React from "react";
import { Swords } from "lucide-react";

export default function PublicHomeHero({ onJoin }) {
  return <section className="hero-public">
    <div>
      <span className="eyebrow">✦ UM LUGAR PARA AVENTUREIROS ✦</span>
      <h1>Uma comunidade.<br/><em>Muitas jornadas.</em></h1>
      <p>Histórias, amizades e conquistas que merecem ser lembradas.</p>
      {onJoin&&<button className="gold-btn" onClick={onJoin}>Fazer parte da comunidade <Swords size={17}/></button>}
    </div>
    <div className="hero-emblem"><Swords size={110}/><span>✦</span></div>
  </section>;
}
