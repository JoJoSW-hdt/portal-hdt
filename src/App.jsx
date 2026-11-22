import React, { useState } from "react";
import { Clock3 } from "lucide-react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import { usePortalSession } from "./hooks/usePortalSession";
import { usePortalData } from "./hooks/usePortalData";
import { usePortalActions } from "./hooks/usePortalActions";
import { usePortalPermissions } from "./hooks/usePortalPermissions";
import { usePortalFormState } from "./hooks/usePortalFormState";
import { usePortalViewState } from "./hooks/usePortalViewState";
import { roleNames, Brand, ConfigNotice } from "./components/PortalShared";
import PublicPortalLayout from "./components/PublicPortalLayout";
import AdminPortalLayout from "./components/AdminPortalLayout";
import AdminPortalContent from "./components/AdminPortalContent";
import PublicPortalContent from "./components/PublicPortalContent";


export default function App(){
 const [profile,setProfile]=useState(null),[members,setMembers]=useState([]),[badges,setBadges]=useState([]),[awards,setAwards]=useState([]),[ranks,setRanks]=useState([]),[newsPosts,setNewsPosts]=useState([]),[events,setEvents]=useState([]),[staffPermissions,setStaffPermissions]=useState({approve_members:true,grant_badges:true,grant_exp:true,publish_news:true}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[showAuth,setShowAuth]=useState(false);
 const {
  authMode,setAuthMode,email,setEmail,password,setPassword,username,setUsername,
  displayName,setDisplayName,discord,setDiscord,tagline,setTagline,avatarFile,setAvatarFile,
  editingBadge,setEditingBadge,badgeName,setBadgeName,badgeDesc,setBadgeDesc,
  badgeRarity,setBadgeRarity,badgeExp,setBadgeExp,badgeFile,setBadgeFile,
  grantMember,setGrantMember,grantBadge,setGrantBadge,
 } = usePortalFormState();
 const { view, setView, adminMode, setAdminMode, search, setSearch, selectedBadge, setSelectedBadge, selectedMember, setSelectedMember, pending, filtered } = usePortalViewState(members);
 const [session,setSession]=usePortalSession(supabase,{setAdminMode,setView});

 const { loadPublic, loadProfile } = usePortalData({
  supabase, hasSupabaseConfig, session,
  setMembers, setBadges, setAwards, setRanks, setNewsPosts, setEvents,
  setStaffPermissions, setProfile, setLoading, setMessage,
 });
 const { isAdmin, isFounder, canManageEvents, canApprove, canGrant, canPublish, canGrantExp, canEnterAdmin } = usePortalPermissions(profile, staffPermissions);
 const {
  submitAuth, updateProfile, memberAction, saveBadge, deleteBadge,
  grant, revoke, manageMember, revokeMemberAccess,
 } = usePortalActions({
  supabase, profile, authMode, setAuthMode, setShowAuth,
  email, password, username, displayName, avatarFile, discord, tagline,
  editingBadge, badgeFile, badgeName, badgeDesc, badgeRarity, badgeExp,
  grantMember, grantBadge, setBusy, setMessage, setAvatarFile,
  setEditingBadge, setBadgeName, setBadgeDesc, setBadgeRarity, setBadgeExp, setBadgeFile,
  setSelectedMember, loadProfile, loadPublic,
 });
 if(!hasSupabaseConfig)return <ConfigNotice/>;if(loading)return <div className="loading-screen"><div className="spinner"/>Preparando sua jornada...</div>;
 if(session&&!profile)return <div className="loading-screen">{message||"Preparando perfil..."}</div>;
 if(session&&profile.status!=="approved")return <main className="auth-wrap"><section className="auth-card pending-card"><Brand/><div className="pending-icon"><Clock3 size={34}/></div><h1>{profile.status==="suspended"?"Acesso ao portal revogado":"Seu cadastro está em análise"}</h1><p>{profile.status==="suspended"?"O acesso desta conta foi revogado pela administração. Se acredita que isso aconteceu por engano, entre em contato com a equipe.":"A administração precisa aprovar sua entrada antes de liberar o acesso."}</p><button className="outline-btn" onClick={()=>supabase.auth.signOut()}>Sair da conta</button></section></main>;
 if(!adminMode)return <PublicPortalLayout
  profile={profile} session={session} roleNames={roleNames} canEnterAdmin={canEnterAdmin}
  view={view} setView={setView} setAdminMode={setAdminMode} setDiscord={setDiscord}
  setTagline={setTagline} supabase={supabase} setShowAuth={setShowAuth} setAuthMode={setAuthMode}
  showAuth={showAuth}
  authModalProps={{authMode,setAuthMode,onClose:()=>setShowAuth(false),onSubmit:submitAuth,username,setUsername,displayName,setDisplayName,email,setEmail,password,setPassword,busy,message}}
  selectedBadge={selectedBadge} setSelectedBadge={setSelectedBadge} selectedMember={selectedMember}
  awards={awards} ranks={ranks} manageMember={manageMember} revokeMemberAccess={revokeMemberAccess}
>
  <PublicPortalContent
    view={view} session={session} profile={profile} setShowAuth={setShowAuth}
    setAuthMode={setAuthMode} supabase={supabase} setMessage={setMessage}
    canPublish={canPublish} newsPosts={newsPosts} events={events} members={members}
    awards={awards} badges={badges} setView={setView}
    setSelectedBadge={setSelectedBadge} setSelectedMember={setSelectedMember}
    filtered={filtered} search={search} setSearch={setSearch}
    discord={discord} setDiscord={setDiscord} tagline={tagline} setTagline={setTagline}
    avatarFile={avatarFile} setAvatarFile={setAvatarFile} busy={busy}
    updateProfile={updateProfile}
  />
</PublicPortalLayout>;
 const myAwards=awards.filter(a=>a.member_id===profile.id);
 return <AdminPortalLayout
  profile={profile} roleNames={roleNames} view={view} setView={setView} setAdminMode={setAdminMode}
  setDiscord={setDiscord} setTagline={setTagline} supabase={supabase}
  canApprove={canApprove} canGrant={canGrant} canGrantExp={canGrantExp} canPublish={canPublish}
  canManageEvents={canManageEvents} isAdmin={isAdmin} isFounder={isFounder}
  message={message} setMessage={setMessage} selectedBadge={selectedBadge} setSelectedBadge={setSelectedBadge}
  selectedMember={selectedMember} awards={awards} ranks={ranks} manageMember={manageMember}
  revokeMemberAccess={revokeMemberAccess} onExpGranted={async()=>{await loadPublic();await loadProfile()}}
>
  <AdminPortalContent
   view={view} setView={setView} profile={profile} members={members} badges={badges}
   awards={awards} ranks={ranks} newsPosts={newsPosts} events={events}
   filtered={filtered} search={search} setSearch={setSearch}
   selectedBadge={selectedBadge} setSelectedBadge={setSelectedBadge}
   selectedMember={selectedMember} setSelectedMember={setSelectedMember}
   discord={discord} setDiscord={setDiscord} tagline={tagline} setTagline={setTagline}
   avatarFile={avatarFile} setAvatarFile={setAvatarFile} busy={busy}
   updateProfile={updateProfile} myAwards={myAwards} pending={pending}
   canApprove={canApprove} memberAction={memberAction} isAdmin={isAdmin}
   editingBadge={editingBadge} badgeName={badgeName} badgeDesc={badgeDesc}
   badgeRarity={badgeRarity} badgeExp={badgeExp} badgeFile={badgeFile}
   saveBadge={saveBadge} setBadgeName={setBadgeName} setBadgeDesc={setBadgeDesc}
   setBadgeRarity={setBadgeRarity} setBadgeExp={setBadgeExp} setBadgeFile={setBadgeFile}
   setEditingBadge={setEditingBadge} deleteBadge={deleteBadge}
   canGrant={canGrant} canPublish={canPublish} grantMember={grantMember}
   grantBadge={grantBadge} setGrantMember={setGrantMember} setGrantBadge={setGrantBadge}
   grant={grant} revoke={revoke} supabase={supabase} loadPublic={loadPublic}
   setMessage={setMessage} canManageEvents={canManageEvents} isFounder={isFounder}
   staffPermissions={staffPermissions}
  />
 </AdminPortalLayout>;
}
