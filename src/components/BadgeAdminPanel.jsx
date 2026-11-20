import React from "react";

export default function BadgeAdminPanel({ editingBadge, badgeName, badgeDesc, badgeRarity, badgeExp, badgeFile, busy, badges, rarityNames, rarityOrder, onSave, onNameChange, onDescriptionChange, onRarityChange, onExpChange, onFileChange, onCancelEdit, onEdit, onDelete }) {
  return (
    <section className="content">
      <div className="panel">
        <div className="panel-heading"><div><h3>{editingBadge?"Editar badge":"Criar nova badge"}</h3><p>Defina arte, nome, descrição e raridade.</p></div></div>
        <form className="badge-form" onSubmit={onSave}>
          <label>Nome da badge<input required minLength="2" maxLength="50" value={badgeName} onChange={e=>onNameChange(e.target.value)} placeholder="Ex: Guardião da primeira jornada"/></label>
          <label>Descrição<textarea maxLength="240" rows="3" value={badgeDesc} onChange={e=>onDescriptionChange(e.target.value)} placeholder="Conte o que torna essa conquista especial..."/></label>
          <label>EXP concedida ao conquistar<input type="number" min="0" max="100000" value={badgeExp} onChange={e=>onExpChange(e.target.value)}/></label>
          <label>Grau de raridade<select value={badgeRarity} onChange={e=>onRarityChange(e.target.value)}>{rarityOrder.map(r=><option value={r} key={r}>{rarityNames[r]}</option>)}</select></label>
          <label>Arte exclusiva<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>onFileChange(e.target.files?.[0]||null)}/></label>
          {editingBadge?.image_url&&!badgeFile&&<img className="badge-preview" src={editingBadge.image_url}/>}
          <div className="form-actions"><button className="primary-btn" disabled={busy}>{busy?"Salvando...":editingBadge?"Salvar alterações":"Criar badge"}</button>{editingBadge&&<button type="button" className="outline-btn" onClick={onCancelEdit}>Cancelar edição</button>}</div>
        </form>
      </div>
      <div className="panel"><h3>Catálogo ({badges.length})</h3><div className="admin-badge-list">{badges.map(b=><div className="admin-badge-row" key={b.id}><img src={b.image_url}/><div><strong>{b.name}</strong><span>{rarityNames[b.rarity]}</span><p>{b.description}</p></div><button className="icon-btn" onClick={()=>onEdit(b)}><span aria-hidden="true">✎</span></button><button className="icon-btn danger" onClick={()=>onDelete(b.id)}><span aria-hidden="true">×</span></button></div>)}</div></div>
    </section>
  );
}
