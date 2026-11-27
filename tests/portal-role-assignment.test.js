import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261127193000_restrict_role_assignment_to_founder.sql", import.meta.url),
  "utf8",
);

test("member approval remains permission-based while role assignment is Founder-only", () => {
  assert.match(migration, /has_portal_permission\('approve_members'\)/i);
  assert.match(migration, /p_role\s+is\s+not\s+null/i);
  assert.match(migration, /role\s*=\s*'founder'/i);
  assert.match(migration, /status\s*=\s*'approved'/i);
  assert.match(migration, /Somente o Fundador pode alterar cargos administrativos/i);
});
