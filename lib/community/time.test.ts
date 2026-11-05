import { test } from "node:test";
import assert from "node:assert/strict";
import { shortAgo } from "./time.ts";

test("hace_poco", () => {
  const now = new Date("2026-11-05T12:00:00Z").getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();
  assert.equal(shortAgo(ago(20_000), now), "ahora");
  assert.equal(shortAgo(ago(12 * 60_000), now), "12 min");
  assert.equal(shortAgo(ago(60 * 60_000), now), "1 h");
  assert.equal(shortAgo(ago(26 * 3600_000), now), "1 d");
  assert.equal(shortAgo(ago(15 * 86400_000), now), "2 sem");
  assert.equal(shortAgo(ago(-60_000), now), "ahora");
});
