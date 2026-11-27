import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261127191500_require_approved_profile_edits.sql", import.meta.url),
  "utf8",
);

test("the SECURITY DEFINER profile edit RPC requires an approved profile", () => {
  assert.match(migration, /create or replace function public\.update_my_public_profile/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /p\.status\s*=\s*'approved'/i);
  assert.match(migration, /Somente membros aprovados podem editar o perfil/i);
  assert.match(migration, /revoke all on function public\.update_my_public_profile\(text, text, text\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.update_my_public_profile\(text, text, text\) to authenticated/i);
});
