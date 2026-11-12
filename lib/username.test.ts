import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanUsernameInput, suggestUsername, usernameProblem, withSuffix } from "./username.ts";

test("sugerencia_desde_el_nombre", () => {
  assert.equal(suggestUsername("Kelly Jeaneth Chacon Contreras", null), "kellychacon");
  assert.equal(suggestUsername("Luis Useche", null), "luisuseche");
  assert.equal(suggestUsername("Anthonella Pernía", null), "anthonellapernia");
  assert.equal(suggestUsername("José Muñoz", null), "josemunoz");
  assert.equal(suggestUsername("Owen Jesus Alexis Chacòn Contreras", null), "owenalexis");
});

test("sugerencia_sin_nombre_usa_el_correo", () => {
  assert.equal(suggestUsername(null, "pedro.chacon@gmail.com"), "pedro.chacon");
  assert.equal(suggestUsername("", "_raro_@x.com"), "raro");
  assert.equal(suggestUsername("Eris 丂乙Џ", "erisg182@gmail.com"), "eris");
  assert.equal(suggestUsername(null, "ab@x.com"), "comensal");
});

test("sugerencia_siempre_valida", () => {
  for (const [n, e] of [
    ["Kelly Jeaneth Chacon Contreras", null],
    ["A", "x@y.com"],
    ["Juan José Vargas Bertaggia de la Santísima Trinidad", null],
    [null, "hrp9szw4bb@privaterelay.appleid.com"],
  ] as const) {
    const s = suggestUsername(n, e);
    assert.equal(usernameProblem(s), null, s);
    assert.equal(usernameProblem(withSuffix(s, 27)), null, withSuffix(s, 27));
  }
});

test("reglas_del_usuario", () => {
  assert.equal(usernameProblem("ab"), "Mínimo 3 caracteres");
  assert.equal(usernameProblem("mimi"), null);
  assert.equal(usernameProblem("Halfosete"), null);
  assert.equal(usernameProblem(".mimi"), "No puede empezar ni terminar con . o _");
  assert.equal(usernameProblem("mimi_"), "No puede empezar ni terminar con . o _");
  assert.equal(usernameProblem("mi..mi"), "No puede tener dos puntos seguidos");
  assert.equal(usernameProblem("mi mi"), "Solo letras, números, _ y .");
});

test("limpiar_lo_que_escribe", () => {
  assert.equal(cleanUsernameInput("Kelly Chacón!"), "KellyChacn");
  assert.equal(cleanUsernameInput("a".repeat(30)).length, 20);
});
