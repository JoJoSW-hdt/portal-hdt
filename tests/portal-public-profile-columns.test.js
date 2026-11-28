import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261127234000_limit_anonymous_profile_columns.sql", import.meta.url),
  "utf8",
);
const publicData = readFileSync(
  new URL("../src/lib/portalData.js", import.meta.url),
  "utf8",
);
const communityData = readFileSync(
  new URL("../src/lib/communityData.js", import.meta.url),
  "utf8",
);

test("anonymous profile reads are limited to fields used by public member views", () => {
  assert.match(migration, /revoke select on table public\.profiles from anon/i);
  assert.match(migration, /grant select \([\s\S]*id,[\s\S]*display_name,[\s\S]*avatar_url,[\s\S]*discord_handle,[\s\S]*tagline,[\s\S]*community_rank_id[\s\S]*\) on table public\.profiles to anon/i);
  assert.doesNotMatch(migration, /\bbio\b|updated_at/i);
});

test("public data queries only request anonymous-readable profile columns", () => {
  assert.match(publicData, /select\("id,username,display_name,discord_handle,tagline,avatar_url,role,status,created_at,community_rank_id/);
  assert.match(communityData, /from\("profiles"\)\.select\("id,display_name,username,avatar_url,role"\)/);
  assert.doesNotMatch(publicData, /profiles"\)\.select\("\*"/);
  assert.doesNotMatch(communityData, /profiles"\)\.select\("\*"/);
});
