import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedCommunityImageUrl } from "../src/lib/communityImages.js";

const base = "https://vbgghmyboyxtmpxnvmvw.supabase.co/storage/v1/object/public/portal-assets/posts";
const member = "123e4567-e89b-12d3-a456-426614174000";
const image = "550e8400-e29b-41d4-a716-446655440000";

test("community images accept only uploaded portal post assets", () => {
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    assert.equal(isAllowedCommunityImageUrl(`${base}/${member}/${image}.${ext}`), true);
  }
});

test("community images reject remote trackers, other buckets, and unsafe paths", () => {
  for (const url of [
    "https://tracker.example/pixel.png",
    `https://vbgghmyboyxtmpxnvmvw.supabase.co/storage/v1/object/public/portal-assets/avatars/${member}/123.jpg`,
    `${base}/${member}/../avatars/123.jpg`,
    `${base}/${member}/%2e%2e%2favatars/123.jpg`,
    `${base}/${member}/${image}.svg`,
    `${base}/${member}/${image}.jpg?tracking=1`,
    `javascript:alert(1)`,
  ]) {
    assert.equal(isAllowedCommunityImageUrl(url), false, url);
  }
});
