import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261127190000_require_approved_member_for_deletions.sql", import.meta.url),
  "utf8",
);

test("community owners can delete content only while their profile is approved", () => {
  const deletePolicies = [
    "Authors and moderators delete community posts",
    "Members remove their own reactions",
    "Authors and moderators delete comments",
  ];

  for (const name of deletePolicies) {
    const start = migration.indexOf(`create policy "${name}"`);
    assert.notEqual(start, -1, `missing policy: ${name}`);
    const next = migration.indexOf("\ndrop policy", start + 1);
    const block = migration.slice(start, next === -1 ? undefined : next);
    assert.match(block, /status\s*=\s*'approved'/i, `${name} must require an approved owner`);
  }
});

test("avatar uploads and edits require an approved member profile", () => {
  for (const name of ["Members upload own avatar", "Members update own avatar"]) {
    const start = migration.indexOf(`create policy "${name}"`);
    assert.notEqual(start, -1, `missing policy: ${name}`);
    const next = migration.indexOf("\ndrop policy", start + 1);
    const block = migration.slice(start, next === -1 ? undefined : next);
    assert.match(block, /status\s*=\s*'approved'/i, `${name} must require an approved profile`);
  }
});

test("post image deletion requires approval for owners but preserves moderator access", () => {
  const start = migration.indexOf('create policy "Authors and moderators delete post images"');
  assert.notEqual(start, -1);
  const block = migration.slice(start);
  assert.match(block, /status\s*=\s*'approved'/i);
  assert.match(block, /can_moderate_community\(\)/i);
});
