import { test } from "node:test";
import assert from "node:assert/strict";
import { CUSTOMER_TOPICS, TOPICS, errorMessage, topicLabel } from "./topics.ts";

test("temas_del_comensal_sin_novedades_ni_resenas", () => {
  const keys = CUSTOMER_TOPICS.map((t) => t.key);
  assert.ok(!keys.includes("novedades"));
  assert.ok(!keys.includes("resenas"));
  assert.deepEqual(keys, ["recomiendame", "locales_nuevos", "recetas", "antojos"]);
});

test("orden_y_etiquetas_del_spec", () => {
  assert.deepEqual(
    TOPICS.map((t) => t.label),
    ["Recomiéndame", "Locales nuevos", "Recetas", "Antojos", "Novedades", "Reseñas"],
  );
  assert.equal(topicLabel("recomiendame"), "Recomiéndame");
});

test("mensajes_de_error", () => {
  assert.match(errorMessage("post_rate_limited"), /10/);
  assert.match(errorMessage("owner_no_plan"), /plan activo/);
  assert.doesNotMatch(errorMessage("owner_no_plan"), /\$|Bs/);
  assert.equal(errorMessage("xyz"), "No pudimos publicar. Inténtalo de nuevo.");
  // Supabase manda el código dentro del mensaje del error.
  assert.equal(errorMessage("reply_rate_limited"), errorMessage("  reply_rate_limited "));
});
