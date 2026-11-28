-- Serialize Founder EXP adjustments and rank-promotion reviews with member state changes.

create or replace function public.founder_adjust_exp(
  p_member_id uuid,
  p_amount integer,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_member_status text;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'founder' and status = 'approved'
  ) then
    raise exception 'Somente o Fundador pode corrigir o saldo de EXP.';
  end if;

  if p_amount is null or p_amount = 0 or p_amount < -100000 or p_amount > 100000 then
    raise exception 'Valor de ajuste inválido.';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) not between 3 and 180 then
    raise exception 'Informe o motivo do ajuste.';
  end if;

  select status into v_member_status
  from public.profiles
  where id = p_member_id
  for update;

  if not found or v_member_status <> 'approved' then
    raise exception 'Membro aprovado não encontrado.';
  end if;

  insert into public.member_exp_transactions(member_id, amount, source_type, reason, created_by)
  values (p_member_id, p_amount, 'adjustment', trim(p_reason), auth.uid());
end;
$function$;

revoke all on function public.founder_adjust_exp(uuid, integer, text) from public, anon;
grant execute on function public.founder_adjust_exp(uuid, integer, text) to authenticated;

create or replace function public.admin_review_rank_promotion(
  p_request_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_member uuid;
  v_rank uuid;
  v_member_status text;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved' and role = 'founder'
  ) then
    raise exception 'Somente o Fundador pode confirmar promoções.';
  end if;

  if p_approve is null then
    raise exception 'Informe se a sugestão será aprovada ou recusada.';
  end if;

  select member_id, suggested_rank_id
    into v_member, v_rank
  from public.rank_promotion_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Sugestão não encontrada ou já analisada.';
  end if;

  if p_approve then
    select status into v_member_status
    from public.profiles
    where id = v_member
    for update;

    if not found or v_member_status <> 'approved' then
      raise exception 'Somente membros aprovados podem receber promoção.';
    end if;

    update public.profiles
    set community_rank_id = v_rank, updated_at = now()
    where id = v_member;

    update public.rank_promotion_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id;
  else
    update public.rank_promotion_requests
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id;
  end if;
end;
$function$;

revoke all on function public.admin_review_rank_promotion(uuid, boolean) from public, anon;
grant execute on function public.admin_review_rank_promotion(uuid, boolean) to authenticated;
