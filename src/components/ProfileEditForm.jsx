import React from "react";
import { UserRound } from "lucide-react";

export default function ProfileEditForm({
  profile,
  discord,
  tagline,
  avatarFile,
  busy,
  onDiscordChange,
  onTaglineChange,
  onAvatarChange,
  onSubmit,
}) {
  return (
    <form className="profile-form" onSubmit={onSubmit}>
      <div className="avatar-edit">
        {profile.avatar_url ? <img src={profile.avatar_url} /> : <UserRound size={34} />}
        <label className="file-label">
          {avatarFile ? avatarFile.name : "Escolher foto"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => onAvatarChange(e.target.files?.[0] || null)}
          />
        </label>
      </div>
      <label>
        Nick do Discord
        <input
          maxLength="40"
          value={discord}
          onChange={(e) => onDiscordChange(e.target.value)}
          placeholder="ex: aventureiro"
        />
      </label>
      <label>
        Frase de efeito
        <textarea
          rows="3"
          maxLength="120"
          value={tagline}
          onChange={(e) => onTaglineChange(e.target.value)}
          placeholder="Uma frase que representa sua jornada..."
        />
      </label>
      <button className="primary-btn" disabled={busy}>Salvar perfil</button>
    </form>
  );
}
