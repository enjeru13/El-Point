#!/usr/bin/env node
// Arma un solo archivo .sql para probar migraciones que aún no están en la
// base de datos, sin dejar nada escrito:
//
//   begin;
//     supabase/tests/_helpers.sql
//     migraciones con fecha >= --from (por defecto 20261105000000)
//     cada archivo de prueba pedido
//   rollback;
//
// Uso:
//   node scripts/sqltest.mjs supabase/tests/level_curve.sql [más pruebas...] [--from 20261105000000]
//
// Escribe supabase/tests/.out/run.sql. Para correrlo (sin VPN):
//   npx supabase@3 db query --linked --yes -f supabase/tests/.out/run.sql
// o pégalo en el SQL Editor del panel de Supabase. Si todo pasa, la salida
// trae solo líneas "ok: …"; una prueba que falla corta con "FAIL: …".

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
let from = "20261105000000";
const tests = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--from") from = args[++i];
  else tests.push(args[i]);
}
if (tests.length === 0) {
  console.error("Uso: node scripts/sqltest.mjs <prueba.sql> [...] [--from AAAAMMDDHHMMSS]");
  process.exit(1);
}

const migDir = "supabase/migrations";
const migrations = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql") && f.slice(0, 14) >= from)
  .sort();

// Cada prueba corre en su propia transacción (con las migraciones otra vez),
// así los ayudantes y tablas temporales de una no chocan con los de otra.
const helpers = readFileSync("supabase/tests/_helpers.sql", "utf8");
const migSql = migrations
  .map((m) => `-- ===== migración ${m} =====\n${readFileSync(join(migDir, m), "utf8")}`)
  .join("\n\n");
const parts = [];
for (const t of tests) {
  parts.push(
    [
      `-- ######## prueba ${t} ########`,
      "begin;",
      `-- ===== _helpers.sql =====\n${helpers}`,
      migSql,
      `-- ===== prueba ${t} =====\nselect pg_temp.as_admin_db();\n${readFileSync(t, "utf8")}`,
      "rollback;",
    ].join("\n\n"),
  );
}
parts.push(`select 'TODO OK: ${tests.length} archivos de prueba' as resultado;`);

mkdirSync("supabase/tests/.out", { recursive: true });
const out = "supabase/tests/.out/run.sql";
writeFileSync(out, parts.join("\n\n"));
console.log(`Migraciones incluidas (${migrations.length}): ${migrations.join(", ") || "ninguna"}`);
console.log(`Pruebas: ${tests.join(", ")}`);
console.log(`Archivo: ${out}`);
