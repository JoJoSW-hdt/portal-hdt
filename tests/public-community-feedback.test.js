import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/components/PublicPortalLayout.jsx", import.meta.url), "utf8");
const content = readFileSync(new URL("../src/components/PublicPortalContent.jsx", import.meta.url), "utf8");

test("public portal receives and renders dismissible feedback notices", () => {
  assert.match(app, /showAuth=\{showAuth\} message=\{message\} setMessage=\{setMessage\}/);
  assert.match(layout, /message && <div className="global-notice" role="status"/);
  assert.match(layout, /onClick=\{\(\) => setMessage\("\"\)\}/);
});

test("community actions report feedback on both home and community views", () => {
  assert.match(content, /view === "home"[\s\S]*?onMessage=\{setMessage\}/);
  assert.match(content, /view === "community"[\s\S]*?onMessage=\{setMessage\}/);
});
