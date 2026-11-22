import React from "react";
import FounderAdminPanel from "./FounderAdminPanel";
import MemberApprovals from "./MemberApprovals";
import DashboardOverview from "./DashboardOverview";
import ProfileEditForm from "./ProfileEditForm";
import MyBadges from "./MyBadges";
import BadgeGrantPanel from "./BadgeGrantPanel";
import BadgeAdminPanel from "./BadgeAdminPanel";
import MemberDirectory from "./MemberDirectory";
import NewsAdminPanel from "./NewsAdminPanel";
import EventAdminPanel from "./EventAdminPanel";
import { BadgeCatalog, rarityNames, rarityOrder } from "./PortalShared";

export default function AdminPortalContent({
  view, setView, profile, members, badges, awards, ranks, newsPosts, events,
  filtered, search, setSearch, selectedBadge, setSelectedBadge, selectedMember, setSelectedMember,
  discord, setDiscord, tagline, setTagline, avatarFile, setAvatarFile,
  busy, updateProfile, myAwards, pending, canApprove, memberAction,
  isAdmin, editingBadge, badgeName, badgeDesc, badgeRarity, badgeExp,
  badgeFile, saveBadge, setBadgeName, setBadgeDesc, setBadgeRarity,
  setBadgeExp, setBadgeFile, setEditingBadge, deleteBadge,
  canGrant, canPublish, grantMember, grantBadge, setGrantMember, setGrantBadge,
  grant, revoke, supabase, loadPublic, setMessage, canManageEvents,
  isFounder, staffPermissions,
}) {
  return (
    <>
      {view === "dashboard" && <DashboardOverview profile={profile} membersCount={members.length} badgesCount={badges.length} myAwards={myAwards} onEditProfile={() => setView("myprofile")} onBadge={setSelectedBadge}/>}
      {view === "members" && <MemberDirectory members={filtered} awards={awards} search={search} onSearchChange={setSearch} onBadge={setSelectedBadge} onProfile={setSelectedMember}/>}
      {view === "myprofile" && <section className="content"><div className="panel profile-panel"><div className="panel-heading"><div><h3>Personalizar meu perfil</h3><p>Somente você pode alterar estas informações.</p></div></div><ProfileEditForm profile={profile} discord={discord} tagline={tagline} avatarFile={avatarFile} busy={busy} onDiscordChange={setDiscord} onTaglineChange={setTagline} onAvatarChange={setAvatarFile} onSubmit={updateProfile}/></div><MyBadges awards={myAwards} onBadge={setSelectedBadge}/></section>}
      {view === "badges" && <section className="content"><div className="panel"><div className="panel-heading"><div><h3>Catálogo de honrarias</h3><p>Conheça os distintivos existentes no portal.</p></div></div><BadgeCatalog badges={badges}/></div></section>}
      {view === "approvals" && canApprove && <MemberApprovals pending={pending} onAction={memberAction}/>}
      {view === "badgeadmin" && isAdmin && <BadgeAdminPanel editingBadge={editingBadge} badgeName={badgeName} badgeDesc={badgeDesc} badgeRarity={badgeRarity} badgeExp={badgeExp} badgeFile={badgeFile} busy={busy} badges={badges} rarityNames={rarityNames} rarityOrder={rarityOrder} onSave={saveBadge} onNameChange={setBadgeName} onDescriptionChange={setBadgeDesc} onRarityChange={setBadgeRarity} onExpChange={setBadgeExp} onFileChange={setBadgeFile} onCancelEdit={() => {setEditingBadge(null);setBadgeName("");setBadgeDesc("");setBadgeRarity("comum");setBadgeExp(0);setBadgeFile(null)}} onEdit={b => {setEditingBadge(b);setBadgeName(b.name);setBadgeDesc(b.description);setBadgeRarity(b.rarity);setBadgeExp(b.exp_reward||0);setBadgeFile(null);window.scrollTo({top:0,behavior:"smooth"})}} onDelete={deleteBadge}/>}
      {view === "grant" && canGrant && <BadgeGrantPanel members={members} badges={badges} awards={awards} rarityNames={rarityNames} grantMember={grantMember} grantBadge={grantBadge} onMemberChange={setGrantMember} onBadgeChange={setGrantBadge} onGrant={grant} onRevoke={revoke}/>}
      {view === "newsadmin" && canPublish && <NewsAdminPanel supabase={supabase} profile={profile} newsPosts={newsPosts} onRefresh={loadPublic} onMessage={setMessage}/>}
      {view === "eventsadmin" && canManageEvents && <EventAdminPanel supabase={supabase} profile={profile} events={events} badges={badges} onRefresh={loadPublic} onMessage={setMessage}/>}
      {view === "ranks" && isFounder && <FounderAdminPanel supabase={supabase} members={members} ranks={ranks} staffPermissions={staffPermissions} onRefresh={loadPublic} onMessage={setMessage}/>}
    </>
  );
}