import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/hooks/usePortalData.js", import.meta.url), "utf8");

test("public data requests ignore stale responses", () => {
  assert.match(source, /const publicRequest = useRef\(0\)/);
  assert.match(source, /if \(requestId !== publicRequest\.current\) return/);
  assert.match(source, /if \(requestId === publicRequest\.current\)\s*\{\s*setMessage/);
});

test("profile requests cannot overwrite a newer session profile", () => {
  assert.match(source, /const profileRequest = useRef\(0\)/);
  assert.match(source, /if \(requestId !== profileRequest\.current\) return/);
  assert.match(source, /if \(requestId === profileRequest\.current\) setLoading\(false\)/);
  assert.match(source, /if \(!session\?\.user\?\.id\)/);
});
