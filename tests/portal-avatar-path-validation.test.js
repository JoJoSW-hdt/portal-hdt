import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261128031000_validate_avatar_filename.sql", import.meta.url),
  "utf8",
);

const validAvatarFilename = /^[0-9]+\.(png|jpe?g|webp)$/i;

test("avatar RPC only accepts one timestamp-based image filename after the member folder", () => {
  assert.ok(
    migration.includes("substring(p_avatar_url from char_length(v_avatar_prefix) + 1) !~* '^[0-9]+\\.(png|jpe?g|webp)$'"),
  );
  assert.match(migration, /set search_path = pg_catalog, public/i);
  assert.match(migration, /grant execute on function public\.update_my_public_profile\(text, text, text\) to authenticated/i);
});

test("avatar filename validation accepts current upload formats and rejects path traversal", () => {
  for (const filename of ["1795123656870.jpg", "1795123656870.jpeg", "1795123656870.PNG", "1795123656870.webp"]) {
    assert.equal(validAvatarFilename.test(filename), true, filename);
  }

  for (const filename of ["../other-member/avatar.jpg", "%2e%2e%2favatar.jpg", "123.jpg/../../avatar.png", "avatar.jpg", "123.svg", "123.jpg?x=1"]) {
    assert.equal(validAvatarFilename.test(filename), false, filename);
  }
});
