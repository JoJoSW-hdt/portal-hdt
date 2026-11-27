import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261127195500_protect_founder_and_badge_history.sql", import.meta.url),
  "utf8",
);
const rankMigration = readFileSync(
  new URL("../supabase/migrations/20261127211000_serialize_founder_exp_and_rank_review.sql", import.meta.url),
  "utf8",
);
const hardeningMigration = readFileSync(
  new URL("../supabase/migrations/20261127210000_harden_exp_and_badge_revoke_audit.sql", import.meta.url),
  "utf8",
);
const badgePanel = readFileSync(
  new URL("../src/components/BadgeGrantPanel.jsx", import.meta.url),
  "utf8",
);
const founderPanel = readFileSync(
  new URL("../src/components/FounderAdminPanel.jsx", import.meta.url),
  "utf8",
);
const memberModal = readFileSync(
  new URL("../src/components/MemberModal.jsx", import.meta.url),
  "utf8",
);

test("approval RPC only approves or rejects pending non-Founder accounts", () => {
  const start = migration.indexOf("create or replace function public.admin_update_member");
  const end = migration.indexOf("create or replace function public.founder_update_member_role", start);
  const block = migration.slice(start, end);
  assert.match(block, /p_status not in \('approved', 'rejected'\)/i);
  assert.match(block, /v_target_status <> 'pending'/i);
  assert.match(block, /v_target_role = 'founder'/i);
  assert.match(block, /p_role is not null/i);
});

test("Founder role cannot be changed through either role-management RPC", () => {
  assert.match(migration, /v_target_role = 'founder'[\s\S]*cargo de outro Founder/i);
  assert.match(migration, /if v_old = 'founder'[\s\S]*cargo de outro Founder/i);
});

test("badge grants require an approved target member", () => {
  const start = migration.indexOf("create or replace function public.admin_grant_badge");
  const end = migration.indexOf("create or replace function public.admin_delete_badge", start);
  const block = migration.slice(start, end);
  assert.match(block, /status = 'approved'/i);
  assert.match(block, /Somente membros aprovados podem receber badges/i);
});

test("deleting an awarded badge is blocked to preserve member history", () => {
  const start = migration.indexOf("create or replace function public.admin_delete_badge");
  const block = migration.slice(start);
  assert.match(block, /for update/i);
  assert.match(block, /from public\.member_badges[\s\S]*badge_id = p_badge_id/i);
  assert.match(block, /preservar o histórico dos membros/i);
});

test("badge grant UI only lists approved members", () => {
  assert.match(badgePanel, /members\.filter\(member => member\.status === "approved"\)/);
});

test("Founder is excluded from Staff assignment UI and protected in member modal", () => {
  assert.match(founderPanel, /m\.status==="approved"&&m\.role!=="founder"/);
  assert.match(memberModal, /member\.role === "founder"[\s\S]*cargo Founder é protegido/i);
});


test("EXP and badge grants lock the member row before checking approval", () => {
  const expStart = hardeningMigration.indexOf("create or replace function public.admin_grant_exp");
  const expEnd = hardeningMigration.indexOf("create or replace function public.admin_grant_badge", expStart);
  const expBlock = hardeningMigration.slice(expStart, expEnd);
  assert.match(expBlock, /from public[.]profiles[\s\S]*for update/i);

  const badgeStart = hardeningMigration.indexOf("create or replace function public.admin_grant_badge");
  const badgeEnd = hardeningMigration.indexOf("create or replace function public.admin_revoke_badge", badgeStart);
  const badgeBlock = hardeningMigration.slice(badgeStart, badgeEnd);
  assert.match(badgeBlock, /from public[.]profiles[\s\S]*for update/i);
});

test("badge revocation is recorded in the administrative audit log", () => {
  const start = hardeningMigration.indexOf("create or replace function public.admin_revoke_badge");
  const block = hardeningMigration.slice(start);
  assert.match(block, /for update of mb/i);
  assert.match(block, /insert into public[.]member_admin_audit/i);
  assert.match(block, /'badge_revoked'/i);
});


test("Founder EXP adjustments lock the target member and require approval", () => {
  const start = rankMigration.indexOf("create or replace function public.founder_adjust_exp");
  const end = rankMigration.indexOf("create or replace function public.admin_review_rank_promotion", start);
  const block = rankMigration.slice(start, end);
  assert.match(block, /from public[.]profiles[\s\S]*for update/i);
  assert.match(block, /v_member_status <> 'approved'/i);
});

test("rank-promotion reviews lock pending requests and approved member rows", () => {
  const start = rankMigration.indexOf("create or replace function public.admin_review_rank_promotion");
  const block = rankMigration.slice(start);
  assert.match(block, /status = 'pending'[\s\S]*for update/i);
  assert.match(block, /from public[.]profiles[\s\S]*for update/i);
  assert.match(block, /p_approve is null/i);
});
