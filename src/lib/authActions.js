export async function submitPortalAuth(supabase, { authMode, email, password, username, displayName }) {
  if (authMode === "signup") {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim(), display_name: displayName.trim() } },
    });
    if (error) throw error;
    return {
      mode: "login",
      message: "Cadastro enviado! Aguarde a análise da equipe. Confira também sua caixa de spam/lixo eletrônico para não perder mensagens de confirmação.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { mode: authMode, message: "" };
}
