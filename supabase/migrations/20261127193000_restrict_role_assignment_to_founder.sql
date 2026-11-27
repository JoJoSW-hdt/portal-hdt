-- Role assignment is a Founder-only operation in the portal UI.
-- Keep admin_update_member's member-approval capability for Admin / authorized Staff,
-- but do not let those roles bypass the Founder-only role management screen.
create or replace function public.admin_update_member(
  p_member_id uuid,
  p_status text default null,
  p_role text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if not public.has_portal_permission('approve_members') then
    raise exception 'Você não tem permissão para administrar membros.';
  end if;

  if p_status is not null and p_status not in ('approved', 'rejected', 'suspended', 'pending') then
    raise exception 'Status inválido.';
  end if;

  if p_role is not null then
    if not exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'founder'
        and status = 'approved'
    ) then
      raise exception 'Somente o Fundador pode alterar cargos administrativos.';
    end if;

    if p_role not in ('staff', 'admin', 'moderator', 'organizer', 'member') then
      raise exception 'Cargo inválido.';
    end if;

    if p_member_id = auth.uid() then
      raise exception 'Você não pode alterar seu próprio cargo.';
    end if;
  end if;

  update public.profiles
  set status = coalesce(p_status, status),
      role = coalesce(p_role, role),
      updated_at = now()
  where id = p_member_id;

  if not found then
    raise exception 'Membro não encontrado.';
  end if;
end;
$function$;

revoke all on function public.admin_update_member(uuid, text, text) from public, anon;
grant execute on function public.admin_update_member(uuid, text, text) to authenticated;
