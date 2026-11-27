import test from "node:test";
import assert from "node:assert/strict";
import { usePortalPermissions } from "../src/hooks/usePortalPermissions.js";
import { resolveNewsPublishedAt } from "../src/lib/newsSchedule.js";
import { fetchAuthenticatedProfile } from "../src/lib/profileData.js";

test("pending and suspended profiles receive no administrative permissions", () => {
  for (const status of ["pending", "suspended", "rejected"]) {
    const access = usePortalPermissions({ id: "member-1", role: "founder", status });
    assert.equal(access.canEnterAdmin, false);
    assert.equal(access.canPublish, false);
    assert.equal(access.canGrantExp, false);
  }
});

test("staff permissions are limited to the switches granted by the founder", () => {
  const access = usePortalPermissions(
    { id: "staff-1", role: "staff", status: "approved" },
    { approve_members: true, grant_badges: false, grant_exp: true, publish_news: false },
  );
  assert.equal(access.canApprove, true);
  assert.equal(access.canGrant, false);
  assert.equal(access.canGrantExp, true);
  assert.equal(access.canPublish, false);
  assert.equal(access.canManageEvents, true);
});

test("legacy admin role cannot publish news or manage events from the interface", () => {
  const access = usePortalPermissions({ id: "admin-1", role: "admin", status: "approved" });
  assert.equal(access.isAdmin, true);
  assert.equal(access.canPublish, false);
  assert.equal(access.canManageEvents, false);
});

test("clearing a future news schedule changes it to immediate publication", () => {
  const now = new Date("2026-11-27T12:00:00.000Z");
  const scheduled = { status: "published", published_at: "2026-12-01T12:00:00.000Z" };
  assert.equal(resolveNewsPublishedAt("", scheduled, now), null);
});

test("editing already-published news preserves its original publication date", () => {
  const now = new Date("2026-11-27T12:00:00.000Z");
  const published = { status: "published", published_at: "2026-11-20T12:00:00.000Z" };
  assert.equal(resolveNewsPublishedAt("", published, now), published.published_at);
});

test("a new schedule is converted to UTC ISO time", () => {
  const value = resolveNewsPublishedAt("2026-12-01T09:30", null);
  assert.match(value, /^2026-12-01T/);
});

test("missing profile data returns a recoverable error instead of dereferencing null", async () => {
  const supabase = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: null, error: { message: "Profile not found" } }),
      };
    },
  };
  const result = await fetchAuthenticatedProfile(supabase, "missing-user");
  assert.equal(result.profile, null);
  assert.equal(result.error.message, "Profile not found");
  assert.equal(result.staffPermissions.grant_exp, false);
});

test("staff permissions fail closed when the permissions row cannot be read", async () => {
  const profile = { id: "staff-1", status: "approved", role: "staff", community_rank_id: null };
  const supabase = {
    from(table) {
      const query = {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => {
          if (table === "profiles") return { data: profile, error: null };
          if (table === "portal_roles") return { data: null, error: { message: "Permission lookup failed" } };
          return { data: { exp_total: 50 }, error: null };
        },
      };
      return query;
    },
  };
  const result = await fetchAuthenticatedProfile(supabase, "staff-1");
  assert.equal(result.staffPermissions.approve_members, false);
  assert.equal(result.staffPermissions.publish_news, false);
  assert.equal(result.error.message, "Permission lookup failed");
});
