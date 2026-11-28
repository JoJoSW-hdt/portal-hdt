import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authModal = readFileSync(
  new URL("../src/components/AuthModal.jsx", import.meta.url),
  "utf8",
);

test("signup input limits match the database profile constraints", () => {
  assert.match(authModal, /Nick do portal<input required minLength="3" maxLength="24"/);
  assert.match(authModal, /Nome de exibição<input required minLength="1" maxLength="60"/);
});
