import React, { useEffect, useState } from "react";
import { Crown, ShieldCheck, X, Sparkles } from "lucide-react";
import { ProfilePreview } from "./PortalShared";

function MemberModal({
  member,
  awards,
  onClose,
  onBadge,
  ranks = [],
  isFounder = false,
  canGrantExp = false,
  onExpGranted,
  onAdminChange,
  onRevokeAccess,
  supabase,
}) {
  const [expAmount, setExpAmount] = useState(100);
  const [expReason, setExpReason] = useState("");
  const [role, setRole] = useState(member?.role || "member");
  const [rankId, setRankId] = useState(member?.community_rank_id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setRole(member?.role || "member");
    setRankId(member?.community_rank_id || "");
    setError("");
    setHistory([]);
  }, [member?.id, member?.role, member?.community_rank_id]);

  useEffect(() => {
    if (!member?.id) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [member?.id, onClose]);

  useEffect(() => {
    if (!member?.id || !isFounder) return;
    supabase
      .from("member_admin_audit")
      .select("action,old_value,new_value,created_at")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setHistory(data || []));
  }, [member?.id, isFounder, supabase]);

  if (!member) return null;

  async function grantExp(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: grantError } = await supabase.rpc("admin_grant_exp", {
        p_member_id: member.id,
        p_amount: Number(expAmount),
        p_reason: expReason,
      });
      if (grantError) throw grantError;
      member.exp_total = Number(member.exp_total || 0) + Number(expAmount);
      setExpReason("");
      setError("");
      await onExpGranted?.();
    } catch (err) {
      setError(err.message || "Não foi possível conceder EXP.");
    } finally {
      setBusy(false);
    }
  }

  async function save(type) {
    setBusy(true);
    setError("");
    try {
      await onAdminChange(type, member.id, type === "role" ? role : rankId);
      const { data } = await supabase
        .from("member_admin_audit")
        .select("action,old_value,new_value,created_at")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setHistory(data || []);
      if (type === "role") {
        member.role = role;
      } else {
        member.community_rank_id = rankId;
        member.community_ranks = ranks.find((rank) => rank.id === rankId) || null;
      }
    } catch (err) {
      setError(err.message || "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!window.confirm("Revogar o acesso deste membro ao Heróis do Tempo? Ele não conseguirá entrar no portal. Comentários, EXP, badges e histórico serão preservados.")) return;
    setBusy(true);
    setError("");
    try {
      await onRevokeAccess(member.id);
    } catch (err) {
      setError(err.message || "Não foi possível revogar o acesso.");
    } finally {
      setBusy(false);
    }
  }

  const closeModal = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    onClose?.();
  };

  return (
    <div className="modal-backdrop" onPointerDown={(event) => {
      if (event.target === event.currentTarget) closeModal(event);
    }}>
      <div className="member-modal-shell">
        <button
          type="button"
          className="modal-close"
          aria-label="Fechar perfil"
          title="Fechar perfil"
          onPointerDown={closeModal}
          onClick={closeModal}
        >
          <X />
        </button>
        <div
          className="member-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Perfil completo de ${member.display_name || "membro"}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
        <ProfilePreview member={member} awards={awards} onBadge={onBadge} />

        {canGrantExp && member.status === "approved" && (
          <section className="member-admin-tools">
            <div className="member-admin-heading">
              <Sparkles size={18} />
              <div>
                <h3>Conceder EXP</h3>
                <p>Registre uma contribuição deste membro. O motivo ficará no histórico.</p>
              </div>
            </div>
            <form className="grant-form" onSubmit={grantExp}>
              <label>
                Quantidade de EXP
                <input type="number" min="1" max="100000" required value={expAmount} onChange={(event) => setExpAmount(event.target.value)} />
              </label>
              <label>
                Motivo
                <input required minLength="3" maxLength="180" value={expReason} onChange={(event) => setExpReason(event.target.value)} placeholder="Ex.: ajudou a organizar o evento" />
              </label>
              <button className="primary-btn" disabled={busy}>Conceder EXP</button>
            </form>
            {error && <p className="member-admin-error">{error}</p>}
          </section>
        )}

        {isFounder && (
          <section className="member-admin-tools">
            <div className="member-admin-heading">
              <Crown size={18} />
              <div>
                <h3>Administração do membro</h3>
                <p>Alterações restritas ao Fundador e registradas no histórico.</p>
              </div>
            </div>
            <label>
              Cargo administrativo
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="member">Membro</option>
                <option value="staff">Staff</option>
                <option value="admin">Administrador</option>
                <option value="moderator">Moderador</option>
                <option value="organizer">Organizador</option>
              </select>
            </label>
            <button className="subtle-btn" disabled={busy || role === member.role} onClick={() => save("role")}>
              {busy ? "Salvando..." : "Salvar cargo"}
            </button>
            <label>
              Rank da comunidade
              <select value={rankId} onChange={(event) => setRankId(event.target.value)}>
                <option value="">Sem patente atribuída</option>
                {ranks.map((rank) => <option key={rank.id} value={rank.id}>{rank.name}</option>)}
              </select>
            </label>
            <button className="subtle-btn" disabled={busy || rankId === (member.community_rank_id || "")} onClick={() => save("rank")}>
              Salvar patente
            </button>
            {error && <p className="member-admin-error">{error}</p>}
            <div className="member-admin-history">
              <strong>Histórico de alterações</strong>
              {history.length ? history.map((item, index) => (
                <div key={index}>
                  <span>{item.action === "role_changed" ? "Cargo" : item.action === "rank_changed" ? "Patente" : "Acesso"}: {item.old_value || "—"} → {item.new_value || "—"}</span>
                  <small>{new Date(item.created_at).toLocaleString("pt-BR")}</small>
                </div>
              )) : <p>Nenhuma alteração administrativa registrada.</p>}
            </div>
            {member.status === "approved" && member.role !== "founder" && (
              <div className="member-revoke-access">
                <strong>Controle de acesso</strong>
                <p>Revoga o login no portal sem apagar as contribuições e conquistas deste membro.</p>
                <button className="reject-btn" disabled={busy} onClick={revoke}>
                  <ShieldCheck size={15} /> Revogar acesso ao portal
                </button>
              </div>
            )}
            {member.status === "suspended" && <p className="member-admin-error">Este acesso já está revogado.</p>}
          </section>
        )}
        </div>
      </div>
    </div>
  );
}

export default MemberModal;
