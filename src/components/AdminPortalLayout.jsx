import React from "react";
import { ShieldCheck, Users, UserRound, LogOut, X, Clock3, Crown, AlertCircle, Award, CalendarDays, Eye, Pencil, Sparkles } from "lucide-react";
import { Brand, BadgeModal } from "./PortalShared";
import MemberModal from "./MemberModal";

export default function AdminPortalLayout({
  profile, roleNames, view, setView, setAdminMode, setDiscord, setTagline,
  supabase, canApprove, canGrant, canGrantExp, canPublish, canManageEvents,
  isAdmin, isFounder, message, setMessage, selectedBadge, setSelectedBadge,
  selectedMember, awards, ranks, manageMember, revokeMemberAccess,
  onExpGranted, children
}) {
  const titles={dashboard:"Visão geral",members:"Membros",myprofile:"Meu perfil",badges:"Catálogo de badges",approvals:"Aprovações",badgeadmin:"Gerenciar badges",grant:"Conceder badges",newsadmin:"Gerenciar notícias",eventsadmin:"Gerenciar eventos",ranks:"Configurar patentes",community:"Comunidade"};
  return <div className="app-shell">
    <aside className="sidebar">
      <Brand/>
      <button className="back-to-public" onClick={()=>{setAdminMode(false);setView("home")}}>← Voltar ao portal</button>
      <div className="side-label">PORTAL</div>
      <button className={`nav-item ${view==="dashboard"?"active":""}`} onClick={()=>setView("dashboard")}><ShieldCheck/>Visão geral</button>
      <button className={`nav-item ${view==="members"?"active":""}`} onClick={()=>setView("members")}><Users/>Membros</button>
      <button className={`nav-item ${view==="myprofile"?"active":""}`} onClick={()=>{setDiscord(profile.discord_handle||"");setTagline(profile.tagline||"");setView("myprofile")}}><UserRound/>Meu perfil</button>
      <button className={`nav-item ${view==="badges"?"active":""}`} onClick={()=>setView("badges")}><Award/>Badges</button>
      {(canApprove||canGrant||canGrantExp||canPublish||canManageEvents||isFounder)&&<>
        <div className="side-label">ADMINISTRAÇÃO</div>
        {canApprove&&<button className={`nav-item ${view==="approvals"?"active":""}`} onClick={()=>setView("approvals")}><Clock3/>Aprovações</button>}
        {isAdmin&&<button className={`nav-item ${view==="badgeadmin"?"active":""}`} onClick={()=>setView("badgeadmin")}><Sparkles/>Gerenciar badges</button>}
        {canGrant&&<button className={`nav-item ${view==="grant"?"active":""}`} onClick={()=>setView("grant")}><Award/>Conceder badges</button>}
        {canPublish&&<button className={`nav-item ${view==="newsadmin"?"active":""}`} onClick={()=>setView("newsadmin")}><Pencil/>Gerenciar notícias</button>}
        {canManageEvents&&<button className={`nav-item ${view==="eventsadmin"?"active":""}`} onClick={()=>setView("eventsadmin")}><CalendarDays/>Gerenciar eventos</button>}
        {isFounder&&<button className={`nav-item ${view==="ranks"?"active":""}`} onClick={()=>setView("ranks")}><Crown/>Configurar patentes</button>}
      </>}
      <div className="sidebar-bottom"><div className="online-dot"/>Portal conectado</div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div><span className="crumb">HERÓIS DO TEMPO</span><h1>{titles[view]}</h1></div>
        <div className="top-user">
          <div className="avatar">{profile.avatar_url?<img src={profile.avatar_url}/>:<span>{profile.display_name?.slice(0,1)||"H"}</span>}</div>
          <div><strong>{profile.display_name}</strong><small>{roleNames[profile.role]}</small></div>
          <button className="icon-btn" title="Voltar ao portal" onClick={()=>{setAdminMode(false);setView("home")}}><Eye/></button>
          <button className="icon-btn" title="Sair" onClick={()=>supabase.auth.signOut()}><LogOut/></button>
        </div>
      </header>
      {message&&<div className="global-notice"><AlertCircle size={16}/>{message}<button onClick={()=>setMessage("")}><X size={15}/></button></div>}
      {children}
    </main>
    <BadgeModal award={selectedBadge} onClose={()=>setSelectedBadge(null)}/>
    <MemberModal member={selectedMember} awards={awards.filter(a=>a.member_id===selectedMember?.id)} ranks={ranks} isFounder={isFounder} onAdminChange={manageMember} onRevokeAccess={revokeMemberAccess} supabase={supabase} canGrantExp={canGrantExp} onExpGranted={onExpGranted} onClose={()=>setSelectedMember(null)} onBadge={setSelectedBadge}/>
  </div>;
}
