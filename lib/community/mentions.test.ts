import { test } from "node:test";
import assert from "node:assert/strict";
import { activeMentionQuery, insertMention, mentionSegments } from "./mentions.ts";

test("segmentos_mencion", () => {
  assert.deepEqual(mentionSegments("hola @ana!"), [
    { text: "hola ", username: null },
    { text: "@ana", username: "ana" },
    { text: "!", username: null },
  ]);
  assert.deepEqual(mentionSegments("correo a@b.com"), [{ text: "correo a@b.com", username: null }]);
  assert.deepEqual(mentionSegments("@ab corto"), [{ text: "@ab corto", username: null }]);
});

test("consulta_activa", () => {
  assert.equal(activeMentionQuery("hey @an", 7), "an");
  assert.equal(activeMentionQuery("hey @", 5), "");
  assert.equal(activeMentionQuery("mail a@b", 8), null);
  assert.equal(activeMentionQuery("hey @ana listo", 14), null);
});

test("insertar_mencion", () => {
  assert.deepEqual(insertMention("hey @an y", 7, "ana_m"), { text: "hey @ana_m  y", caret: 11 });
});
