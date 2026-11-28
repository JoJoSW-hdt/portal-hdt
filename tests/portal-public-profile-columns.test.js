import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261127234000_limit_anonymous_profile_columns.sql", import.meta.url),
  "utf8",
);

test("anonymous profile reads are limited to fields used by public member views", () => {
  assert.match(migration, /revoke select on table public\.profiles from anon/i);
  assert.match(migration, /grant select \([\s\S]*id,[\s\S]*display_name,[\s\S]*avatar_url,[\s\S]*discord_handle,[\s\S]*tagline,[\s\S]*community_rank_id[\s\S]*\) on table public\.profiles to anon/i);
  assert.doesNotMatch(migration, /\bbio\b|updated_at/i);
});
