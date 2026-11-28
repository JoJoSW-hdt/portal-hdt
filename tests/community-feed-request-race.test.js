import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/CommunityPosts.jsx", import.meta.url), "utf8");

test("community feed ignores responses from superseded requests", () => {
  assert.match(source, /const requestVersion=useRef\(0\)/);
  assert.match(source, /const requestId=\+\+requestVersion\.current/);
  assert.match(source, /if\(requestId!==requestVersion\.current\)return/);
  assert.match(source, /return \(\)=>\{requestVersion\.current\+=1;\}/);
});

test("community pagination prevents overlapping loads and stale appends", () => {
  assert.match(source, /const loadingMoreRef=useRef\(false\)/);
  assert.match(source, /if\(loading\|\|loadingMoreRef\.current\|\|!hasMore\)return/);
  assert.match(source, /if\(requestId===requestVersion\.current\)\{/);
});
