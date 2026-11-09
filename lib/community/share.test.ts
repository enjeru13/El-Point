import { test } from "node:test";
import assert from "node:assert/strict";
import { sharePostText } from "./share.ts";

test("texto_compartir", () => {
  assert.equal(
    sharePostText({ id: "abc", body: "Las mejores  empanadas\nde Barrio Obrero", author: "@carlos" }),
    '"Las mejores empanadas de Barrio Obrero" — @carlos en Comunidad de El Point\nhttps://elpoint-app.netlify.app/p?id=abc',
  );
  const long = sharePostText({ id: "x", body: "a".repeat(200), author: null });
  assert.ok(long.startsWith('"' + "a".repeat(119) + "…\""));
});
