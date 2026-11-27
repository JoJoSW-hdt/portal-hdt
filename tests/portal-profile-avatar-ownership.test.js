import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261127213000_restrict_profile_avatar_urls.sql", import.meta.url),
  "utf8",
);

test("profile RPC only accepts an avatar URL inside the authenticated member's own avatar folder", () => {
  assert.match(migration, /auth\.uid\(\)::text/);
  assert.match(migration, /storage\/v1\/object\/public\/portal-assets\/avatars/);
  assert.match(migration, /left\(p_avatar_url, char_length\(v_avatar_prefix\)\) <> v_avatar_prefix/i);
  assert.match(migration, /position\('\?' in p_avatar_url\)/i);
  assert.match(migration, /position\('#' in p_avatar_url\)/i);
  assert.match(migration, /status = 'approved'/i);
  assert.match(migration, /set search_path = pg_catalog, public/i);
  assert.match(migration, /grant execute on function public\.update_my_public_profile\(text, text, text\) to authenticated/i);
});
