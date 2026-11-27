-- The profile update RPC is SECURITY DEFINER, so enforce the approval
-- requirement inside the function rather than relying on client-side visibility.
create or replace function public.update_my_public_profile(
  p_discord_handle text,
  p_tagline text,
  p_avatar_url text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null then
    raise exception 'Faça login para editar o perfil.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'approved'
  ) then
    raise exception 'Somente membros aprovados podem editar o perfil.';
  end if;

  if char_length(coalesce(p_discord_handle, '')) > 40 then
    raise exception 'Nick do Discord muito longo.';
  end if;

  if char_length(coalesce(p_tagline, '')) > 120 then
    raise exception 'Frase de efeito muito longa.';
  end if;

  update public.profiles
  set discord_handle = trim(coalesce(p_discord_handle, '')),
      tagline = trim(coalesce(p_tagline, '')),
      avatar_url = p_avatar_url,
      updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'Perfil não encontrado.';
  end if;
end;
$function$;

revoke all on function public.update_my_public_profile(text, text, text) from public, anon;
grant execute on function public.update_my_public_profile(text, text, text) to authenticated;
