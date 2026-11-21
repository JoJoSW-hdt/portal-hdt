import {
  saveBadgeRecord,
  deleteBadgeRecord,
  grantBadgeToMember,
  revokeMemberBadge,
} from "../lib/badgeActions";
import {
  updateMemberStatus,
  updateFounderManagedMember,
  revokeMemberPortalAccess,
} from "../lib/memberActions";
import { updateAuthenticatedProfile } from "../lib/profileActions";
import { submitPortalAuth } from "../lib/authActions";

export function usePortalActions({
  supabase,
  profile,
  authMode,
  setAuthMode,
  setShowAuth,
  email,
  password,
  username,
  displayName,
  avatarFile,
  discord,
  tagline,
  editingBadge,
  badgeFile,
  badgeName,
  badgeDesc,
  badgeRarity,
  badgeExp,
  grantMember,
  grantBadge,
  setBusy,
  setMessage,
  setAvatarFile,
  setSelectedMember,
  loadProfile,
  loadPublic,
}) {
  async function submitAuth(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await submitPortalAuth(supabase, {
        authMode, email, password, username, displayName,
      });
      if (result.message) setMessage(result.message);
      if (result.mode !== authMode) setAuthMode(result.mode);
      if (authMode !== "signup") setShowAuth(false);
    } catch (error) {
      setMessage(error.message || "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  async function updateProfile(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateAuthenticatedProfile(supabase, {
        profile, avatarFile, discord, tagline,
      });
      setAvatarFile(null);
      setMessage("Seu perfil foi atualizado!");
      await loadProfile();
      await loadPublic();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function memberAction(id, status, role = null) {
    setBusy(true);
    try {
      await updateMemberStatus(supabase, id, status, role);
      setMessage("Cadastro atualizado.");
      await loadPublic();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveBadge(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveBadgeRecord(supabase, {
        editingBadge, badgeFile, badgeName, badgeDesc, badgeRarity, badgeExp,
      });
      setEditingBadge(null);
      setBadgeName("");
      setBadgeDesc("");
      setBadgeRarity("comum");
      setBadgeExp(0);
      setBadgeFile(null);
      setMessage("Badge salva no catálogo!");
      await loadPublic();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteBadge(id) {
    if (!confirm("Excluir esta badge do catálogo? Ela também será retirada dos perfis.")) return;
    try {
      await deleteBadgeRecord(supabase, id);
      setMessage("Badge excluída.");
      await loadPublic();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function grant() {
    try {
      await grantBadgeToMember(supabase, grantMember, grantBadge);
      setMessage("Badge concedida!");
      await loadPublic();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function revoke(id) {
    try {
      await revokeMemberBadge(supabase, id);
      setMessage("Badge retirada do perfil.");
      await loadPublic();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function manageMember(type, memberId, value) {
    await updateFounderManagedMember(supabase, type, memberId, value);
    setMessage(type === "role" ? "Cargo administrativo atualizado." : "Patente do membro atualizada.");
    await loadPublic();
  }

  async function revokeMemberAccess(memberId) {
    await revokeMemberPortalAccess(supabase, memberId);
    setMessage("Acesso ao portal revogado. O histórico do membro foi preservado.");
    setSelectedMember(null);
    await loadPublic();
  }

  return {
    submitAuth,
    updateProfile,
    memberAction,
    saveBadge,
    deleteBadge,
    grant,
    revoke,
    manageMember,
    revokeMemberAccess,
  };
}
