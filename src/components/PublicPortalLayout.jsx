import React from "react";
import { UserRound, ShieldCheck, LogOut } from "lucide-react";
import { Brand, BadgeModal } from "./PortalShared";
import AuthModal from "./AuthModal";
import MemberModal from "./MemberModal";

export default function PublicPortalLayout({
  profile, session, roleNames, canEnterAdmin, view, setView, setAdminMode,
  setDiscord, setTagline, supabase, setShowAuth, setAuthMode, showAuth,
  authModalProps, selectedBadge, setSelectedBadge, selectedMember, awards,
  ranks, manageMember, revokeMemberAccess, children
}) {
  return <div className="public-site">
    <header className="public-header">
      <Brand/>
      <nav>
        <button onClick={()=>setView("home")}>Início</button>
        <button onClick={()=>setView("news")}>Notícias</button>
        <button onClick={()=>setView("events")}>Eventos</button>
        <button onClick={()=>setView("community")}>Comunidade</button>
        <button onClick={()=>setView("members")}>Membros</button>
        <button onClick={()=>setView("badges")}>Badges</button>
      </nav>
      {session&&profile ? <details className="account-menu">
        <summary>
          <span className="account-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:<span>{profile.display_name?.slice(0,1)||"H"}</span>}</span>
          <span className="account-label"><strong>{profile.display_name}</strong><small>{roleNames[profile.role]}</small></span>
          <span className="account-chevron">▾</span>
        </summary>
        <div className="account-dropdown">
          <button onClick={e=>{e.currentTarget.closest("details")?.removeAttribute("open");setDiscord(profile.discord_handle||"");setTagline(profile.tagline||"");setView("myprofile")}}><UserRound size={16}/>Meu perfil</button>
          {canEnterAdmin&&<button onClick={e=>{e.currentTarget.closest("details")?.removeAttribute("open");setView("dashboard");setAdminMode(true)}}><ShieldCheck size={16}/>Administração</button>}
          <button className="account-logout" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/>Sair</button>
        </div>
      </details> : <button className="primary-btn header-login" onClick={()=>{setShowAuth(true);setAuthMode("login")}}>Entrar no portal</button>}
    </header>
    <main className="public-main">{children}</main>
    <footer className="public-footer">HERÓIS DO TEMPO · UMA CASA PARA AVENTUREIROS</footer>
    {showAuth&&<AuthModal {...authModalProps}/>}
    <BadgeModal award={selectedBadge} onClose={()=>setSelectedBadge(null)}/>
    <MemberModal member={selectedMember} awards={awards.filter(a=>a.member_id===selectedMember?.id)} ranks={ranks} isFounder={false} onAdminChange={manageMember} onRevokeAccess={revokeMemberAccess} supabase={supabase} canGrantExp={false} onClose={()=>setSelectedMember(null)} onBadge={setSelectedBadge}/>
  </div>;
}
