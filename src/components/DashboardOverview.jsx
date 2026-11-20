import React from "react";
import { Users, Award, Crown, Swords } from "lucide-react";
import { Stat, ProfilePreview } from "./PortalShared";

export default function DashboardOverview({
  profile,
  membersCount,
  badgesCount,
  myAwards,
  onEditProfile,
  onBadge,
}) {
  return (
    <section className="content">
      <div className="welcome-panel">
        <div>
          <span>✦ CENTRAL DA COMUNIDADE ✦</span>
          <h2>Bem-vindo de volta,<br />{profile.display_name}!</h2>
          <p>O ponto de encontro dos aventureiros começa aqui.</p>
          <p className="exp-total">
            {Number(profile.exp_total || 0).toLocaleString("pt-BR")} EXP acumulada
          </p>
        </div>
        <div className="welcome-swords"><Swords size={76} /></div>
      </div>
      <div className="stats-grid">
        <Stat icon={<Users />} label="Membros" value={membersCount} />
        <Stat icon={<Award />} label="Badges no catálogo" value={badgesCount} />
        <Stat icon={<Crown />} label="Suas conquistas" value={myAwards.length} />
      </div>
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Seu perfil de aventureiro</h3>
            <p>Suas informações e conquistas.</p>
          </div>
          <button className="subtle-btn" onClick={onEditProfile}>Editar perfil</button>
        </div>
        <ProfilePreview member={profile} awards={myAwards} onBadge={onBadge} />
      </div>
    </section>
  );
}
