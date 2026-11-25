-- Cover the creator foreign key on the EXP ledger.
create index if not exists member_exp_transactions_created_by_idx
on public.member_exp_transactions(created_by);
