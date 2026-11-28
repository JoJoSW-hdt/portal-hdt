import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261127233000_revoke_anonymous_rank_request_read.sql", import.meta.url),
  "utf8",
);

test("anonymous users are not granted direct reads of rank-promotion requests", () => {
  assert.match(migration, /revoke select on table public\.rank_promotion_requests from anon/i);
});
