import { test } from "node:test";
import assert from "node:assert/strict";
import { notifRoute } from "./notifRoute.ts";

test("rutas_aviso", () => {
  assert.equal(notifRoute("post_reply", { kind: "post", post_id: "p" }), "/community/p");
  assert.equal(notifRoute("user_mention", { kind: "post", post_id: "p", reply_id: "r" }), "/community/p");
  assert.equal(notifRoute("post_mention", { kind: "post_mention", post_id: "p", restaurant_id: "r" }), "/community/p");
  assert.equal(notifRoute("sub_expiring", { kind: "subscription", restaurant_id: "r" }), "/subscription");
  assert.equal(notifRoute("moderation", { kind: "claim_approved", restaurant_id: "r" }), "/(owner)");
  assert.equal(notifRoute("moderation", { kind: "review_removed", restaurant_id: "r" }), "/restaurant/r");
  assert.equal(notifRoute("mission", { kind: "suggestion_approved", restaurant_id: "r" }), "/restaurant/r");
  assert.equal(notifRoute("levelup", null), "/(customer)/profile");
  assert.equal(notifRoute("moderation", { kind: "post_report" }), null);
});
