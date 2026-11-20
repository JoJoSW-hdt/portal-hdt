import React from "react";
import { Check, X } from "lucide-react";

export default function MemberApprovals({ pending, onAction }) {
  return (
    <section className="content">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Cadastros aguardando aprovação</h3>
            <p>Libere a entrada de novos aventureiros.</p>
          </div>
        </div>
        {pending.length ? pending.map((member) => (
          <div className="approval-row" key={member.id}>
            <div className="member-info">
              <strong>{member.display_name}</strong>
              <span>@{member.username} · {new Date(member.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="row-actions">
              <button className="approve-btn" onClick={() => onAction(member.id, "approved")}>
                <Check />Aprovar
              </button>
              <button className="reject-btn" onClick={() => onAction(member.id, "rejected")}>
                <X />Recusar
              </button>
            </div>
          </div>
        )) : (
          <div className="empty-state">
            <Check />
            <strong>Nenhum cadastro pendente</strong>
          </div>
        )}
      </div>
    </section>
  );
}
