import { test } from "node:test";
import assert from "node:assert/strict";
import { GATE_COPY, guestMayStayOn, type GateReason } from "./guestAccess.ts";

test("visitante_puede_explorar", () => {
  for (const root of ["(customer)", "restaurant", "community", "legal", "(auth)", "onboarding", undefined]) {
    assert.equal(guestMayStayOn(root), true, String(root));
  }
});

test("visitante_no_entra_a_lo_privado", () => {
  for (const root of ["(owner)", "admin", "settings", "user", "referrals", "subscription", "support", "delete-account", "change-password"]) {
    assert.equal(guestMayStayOn(root), false, root);
  }
});

test("cada_motivo_tiene_texto_completo", () => {
  const reasons = Object.keys(GATE_COPY) as GateReason[];
  assert.ok(reasons.length >= 12);
  for (const r of reasons) {
    const c = GATE_COPY[r];
    assert.ok(c.icon && c.title.length > 3 && c.body.length > 15, r);
    // Sin emojis ni voseo.
    assert.doesNotMatch(c.title + c.body, /\p{Extended_Pictographic}/u, r);
    assert.doesNotMatch(c.body, /\b(creá|tenés|podés|hacé|vos)\b/i, r);
  }
});
