import React, { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import FounderAdminPanel from "./components/FounderAdminPanel";
import CommunityPosts from "./CommunityPosts";
import { fetchPublicPortalData } from "./lib/portalData";
import { fetchAuthenticatedProfile } from "./lib/profileData";
import { usePortalSession } from "./hooks/usePortalSession";
import { usePortalActions } from "./hooks/usePortalActions";
import { roleNames, rarityNames, rarityOrder, Brand, ConfigNotice, BadgeCatalog } from "./components/PortalShared";
import MemberApprovals from "./components/MemberApprovals";
import DashboardOverview from "./components/DashboardOverview";
import ProfileEditForm from "./components/ProfileEditForm";
import MyBadges from "./components/MyBadges";
import BadgeGrantPanel from "./components/BadgeGrantPanel";
import BadgeAdminPanel from "./components/BadgeAdminPanel";
import MemberDirectory from "./components/MemberDirectory";
import PublicMemberDirectory from "./components/PublicMemberDirectory";
import PublicNewsPage from "./components/PublicNewsPage";
import PublicEventsPage from "./components/PublicEventsPage";
import PublicBadgesPage from "./components/PublicBadgesPage";
import PublicHomeHero from "./components/PublicHomeHero";
import PublicHomeSections from "./components/PublicHomeSections";
import NewsAdminPanel from "./components/NewsAdminPanel";
import EventAdminPanel from "./components/EventAdminPanel";
import PublicPortalLayout from "./components/PublicPortalLayout";
import AdminPortalLayout from "./components/AdminPortalLayout";


export default function App(){
 const [profile,setProfile]=useState(null),[view,setView]=useState("home"),[adminMode,setAdminMode]=useState(false),[members,setMembers]=useState([]),[badges,setBadges]=useState([]),[awards,setAwards]=useState([]),[ranks,setRanks]=useState([]),[newsPosts,setNewsPosts]=useState([]),[events,setEvents]=useState([]),[staffPermissions,setStaffPermissions]=useState({approve_members:true,grant_badges:true,grant_exp:true,publish_news:true}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[search,setSearch]=useState(""),[authMode,setAuthMode]=useState("login"),[showAuth,setShowAuth]=useState(false),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[username,setUsername]=useState(""),[displayName,setDisplayName]=useState(""),[discord,setDiscord]=useState(""),[tagline,setTagline]=useState(""),[avatarFile,setAvatarFile]=useState(null),[selectedBadge,setSelectedBadge]=useState(null),[selectedMember,setSelectedMember]=useState(null),[editingBadge,setEditingBadge]=useState(null),[badgeName,setBadgeName]=useState(""),[badgeDesc,setBadgeDesc]=useState(""),[badgeRarity,setBadgeRarity]=useState("comum"),[badgeExp,setBadgeExp]=useState(0),[badgeFile,setBadgeFile]=useState(null),[grantMember,setGrantMember]=useState(""),[grantBadge,setGrantBadge]=useState("");
 const [session,setSession]=usePortalSession(supabase,{setAdminMode,setView});

 useEffect(()=>{if(!hasSupabaseConfig)return;loadPublic();if(session?.user)loadProfile();else{setProfile(null);setLoading(false)}},[session?.user?.id]);
 async function loadPublic(){const data=await fetchPublicPortalData(supabase);setMembers(data.members);setBadges(data.badges);setAwards(data.awards);setRanks(data.ranks);setNewsPosts(data.newsPosts);setEvents(data.events);if(data.errors?.length)setMessage(data.errors.map(item=>`Falha ao carregar ${item.resource}: ${item.message}`).join(" · "))}
 async function loadProfile(){setLoading(true);const result=await fetchAuthenticatedProfile(supabase,session.user.id);if(result.error)setMessage(result.error.message);if(result.staffPermissions)setStaffPermissions(result.staffPermissions);setProfile(result.profile);setLoading(false)}
 const isAdmin=["founder","admin"].includes(profile?.role)&&profile?.status==="approved";const isFounder=profile?.role==="founder"&&profile?.status==="approved";const isStaff=profile?.role==="staff"&&profile?.status==="approved";const canManageEvents=isFounder||isStaff;const canApprove=isAdmin||(isStaff&&staffPermissions.approve_members);const canGrant=isAdmin||(isStaff&&staffPermissions.grant_badges);const canPublish=isFounder||(isStaff&&staffPermissions.publish_news);const canGrantExp=isAdmin||(isStaff&&staffPermissions.grant_exp);const canEnterAdmin=isAdmin||canApprove||canGrant||canGrantExp||canPublish||canManageEvents;const pending=members.filter(m=>m.status==="pending");
 const filtered=useMemo(()=>members.filter(m=>`${m.username} ${m.display_name} ${m.discord_handle||""}`.toLowerCase().includes(search.toLowerCase())),[members,search]);
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
 if(session&&!profile)return <div className="loading-screen">Preparando perfil...</div>;
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
  {view==="home"&&<><PublicHomeHero onJoin={!session?()=>{setShowAuth(true);setAuthMode("signup")}:null}/><CommunityPosts supabase={supabase} profile={session?profile:null} canModerate={canPublish} onMessage={setMessage}/><PublicHomeSections newsPosts={newsPosts} events={events} members={members} awards={awards} badges={badges} onNews={()=>setView("news")} onEvents={()=>setView("events")} onMembers={()=>setView("members")} onBadges={()=>setView("badges")} onBadge={setSelectedBadge} onProfile={setSelectedMember}/></>}
  {view==="community"&&<CommunityPosts supabase={supabase} profile={session?profile:null} canModerate={canPublish}/>}
  {view==="news"&&<PublicNewsPage newsPosts={newsPosts}/>}
  {view==="events"&&<PublicEventsPage events={events}/>}
  {view==="members"&&<PublicMemberDirectory members={filtered.filter(m=>m.status==="approved")} awards={awards} search={search} onSearchChange={setSearch} onBadge={setSelectedBadge} onProfile={setSelectedMember}/>}
  {view==="badges"&&<PublicBadgesPage badges={badges}/>}
  {view==="myprofile"&&session&&profile&&<section className="public-profile-view"><div className="public-section-head"><div><span className="eyebrow">SUA JORNADA</span><h2>Meu perfil</h2><p>Suas informações, patente e conquistas no portal.</p></div></div><div className="panel profile-panel"><div className="panel-heading"><div><h3>Personalizar meu perfil</h3><p>Somente você pode alterar estas informações.</p></div></div><ProfileEditForm profile={profile} discord={discord} tagline={tagline} avatarFile={avatarFile} busy={busy} onDiscordChange={setDiscord} onTaglineChange={setTagline} onAvatarChange={setAvatarFile} onSubmit={updateProfile}/></div><MyBadges awards={awards.filter(a=>a.member_id===profile.id)} onBadge={setSelectedBadge}/></section>}
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
  {view==="dashboard"&&<DashboardOverview profile={profile} membersCount={members.length} badgesCount={badges.length} myAwards={myAwards} onEditProfile={()=>setView("myprofile")} onBadge={setSelectedBadge}/>}
  {view==="members"&&<MemberDirectory members={filtered} awards={awards} search={search} onSearchChange={setSearch} onBadge={setSelectedBadge} onProfile={setSelectedMember}/>}
  {view==="myprofile"&&<section className="content"><div className="panel profile-panel"><div className="panel-heading"><div><h3>Personalizar meu perfil</h3><p>Somente você pode alterar estas informações.</p></div></div><ProfileEditForm profile={profile} discord={discord} tagline={tagline} avatarFile={avatarFile} busy={busy} onDiscordChange={setDiscord} onTaglineChange={setTagline} onAvatarChange={setAvatarFile} onSubmit={updateProfile}/></div><MyBadges awards={myAwards} onBadge={setSelectedBadge}/></section>}
  {view==="badges"&&<section className="content"><div className="panel"><div className="panel-heading"><div><h3>Catálogo de honrarias</h3><p>Conheça os distintivos existentes no portal.</p></div></div><BadgeCatalog badges={badges}/></div></section>}
  {view==="approvals"&&canApprove&&<MemberApprovals pending={pending} onAction={memberAction}/>}
  {view==="badgeadmin"&&isAdmin&&<BadgeAdminPanel editingBadge={editingBadge} badgeName={badgeName} badgeDesc={badgeDesc} badgeRarity={badgeRarity} badgeExp={badgeExp} badgeFile={badgeFile} busy={busy} badges={badges} rarityNames={rarityNames} rarityOrder={rarityOrder} onSave={saveBadge} onNameChange={setBadgeName} onDescriptionChange={setBadgeDesc} onRarityChange={setBadgeRarity} onExpChange={setBadgeExp} onFileChange={setBadgeFile} onCancelEdit={()=>{setEditingBadge(null);setBadgeName("");setBadgeDesc("");setBadgeRarity("comum");setBadgeExp(0);setBadgeFile(null)}} onEdit={b=>{setEditingBadge(b);setBadgeName(b.name);setBadgeDesc(b.description);setBadgeRarity(b.rarity);setBadgeExp(b.exp_reward||0);setBadgeFile(null);window.scrollTo({top:0,behavior:"smooth"})}} onDelete={deleteBadge}/>}
  {view==="grant"&&canGrant&&<BadgeGrantPanel members={members} badges={badges} awards={awards} rarityNames={rarityNames} grantMember={grantMember} grantBadge={grantBadge} onMemberChange={setGrantMember} onBadgeChange={setGrantBadge} onGrant={grant} onRevoke={revoke}/>}
  {view==="newsadmin"&&canPublish&&<NewsAdminPanel supabase={supabase} profile={profile} newsPosts={newsPosts} onRefresh={loadPublic} onMessage={setMessage}/>}
  {view==="eventsadmin"&&canManageEvents&&<EventAdminPanel supabase={supabase} profile={profile} events={events} badges={badges} onRefresh={loadPublic} onMessage={setMessage}/>}
  {view==="ranks"&&isFounder&&<FounderAdminPanel supabase={supabase} members={members} ranks={ranks} staffPermissions={staffPermissions} onRefresh={loadPublic} onMessage={setMessage}/>}
</AdminPortalLayout>;
}
