import React from "react";
import { X } from "lucide-react";
import { Brand } from "./PortalShared";

export default function AuthModal({ authMode, setAuthMode, onClose, onSubmit, username, setUsername, displayName, setDisplayName, email, setEmail, password, setPassword, busy, message }) {
  return <div className="modal-backdrop" onClick={onClose}>
    <form className="auth-modal" onSubmit={onSubmit} onClick={e=>e.stopPropagation()}>
      <button type="button" className="modal-close" onClick={onClose}><X/></button>
      <Brand/>
      <h2>{authMode==="login"?"Entre na sua jornada":"Crie sua conta"}</h2>
      {authMode==="signup"&&<p className="signup-email-hint">Depois de criar sua conta, aguarde a análise da equipe. Confira também sua caixa de spam ou lixo eletrônico para não perder mensagens de confirmação do Heróis do Tempo.</p>}
      {authMode==="signup"&&<>
        <label>Nick do portal<input required minLength="3" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Seu apelido"/></label>
        <label>Nome de exibição<input required value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Como quer aparecer"/></label>
      </>}
      <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Senha<input type="password" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <button className="primary-btn" disabled={busy}>{busy?"Aguarde...":authMode==="login"?"Entrar":"Enviar cadastro"}</button>
      <button type="button" className="text-btn" onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?"Ainda não tem conta? Cadastre-se":"Já tem conta? Entrar"}</button>
      {message&&<p className="notice">{message}</p>}
    </form>
  </div>;
}
