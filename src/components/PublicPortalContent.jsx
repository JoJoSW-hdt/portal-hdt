import React from "react";
import CommunityPosts from "../CommunityPosts";
import PublicMemberDirectory from "./PublicMemberDirectory";
import PublicNewsPage from "./PublicNewsPage";
import PublicEventsPage from "./PublicEventsPage";
import PublicBadgesPage from "./PublicBadgesPage";
import PublicHomeHero from "./PublicHomeHero";
import PublicHomeSections from "./PublicHomeSections";
import ProfileEditForm from "./ProfileEditForm";
import MyBadges from "./MyBadges";

export default function PublicPortalContent({
  view,
  session,
  profile,
  setShowAuth,
  setAuthMode,
  supabase,
  setMessage,
  message,
  canPublish,
  newsPosts,
  events,
  members,
  awards,
  badges,
  setView,
  setSelectedBadge,
  setSelectedMember,
  filtered,
  search,
  setSearch,
  discord,
  setDiscord,
  tagline,
  setTagline,
  avatarFile,
  setAvatarFile,
  busy,
  updateProfile,
}) {
  return (
    <>
      {view === "home" && <>
        <PublicHomeHero onJoin={!session ? () => { setShowAuth(true); setAuthMode("signup"); } : null}/>
        <CommunityPosts supabase={supabase} profile={session ? profile : null} canModerate={canPublish} onMessage={setMessage}/>
        <PublicHomeSections
          newsPosts={newsPosts}
          events={events}
          members={members}
          awards={awards}
          badges={badges}
          onNews={() => setView("news")}
          onEvents={() => setView("events")}
          onMembers={() => setView("members")}
          onBadges={() => setView("badges")}
          onBadge={setSelectedBadge}
          onProfile={setSelectedMember}
        />
      </>}
      {view === "community" && <CommunityPosts supabase={supabase} profile={session ? profile : null} canModerate={canPublish} onMessage={setMessage}/>}
      {view === "news" && <PublicNewsPage newsPosts={newsPosts}/>}
      {view === "events" && <PublicEventsPage events={events}/>}
      {view === "members" && <PublicMemberDirectory members={filtered.filter(member => member.status === "approved")} awards={awards} search={search} onSearchChange={setSearch} onBadge={setSelectedBadge} onProfile={setSelectedMember}/>}
      {view === "badges" && <PublicBadgesPage badges={badges}/>}
      {view === "myprofile" && session && profile && <section className="public-profile-view">
        <div className="public-section-head"><div><span className="eyebrow">SUA JORNADA</span><h2>Meu perfil</h2><p>Suas informações, patente e conquistas no portal.</p></div></div>
        <div className="panel profile-panel">
          <div className="panel-heading"><div><h3>Personalizar meu perfil</h3><p>Somente você pode alterar estas informações.</p></div></div>
          <ProfileEditForm profile={profile} discord={discord} tagline={tagline} avatarFile={avatarFile} busy={busy} onDiscordChange={setDiscord} onTaglineChange={setTagline} onAvatarChange={setAvatarFile} onSubmit={updateProfile}/>
        </div>
        <MyBadges awards={awards.filter(award => award.member_id === profile.id)} onBadge={setSelectedBadge}/>
      </section>}
    </>
  );
}
