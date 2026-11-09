// A dónde lleva un aviso al tocarlo, en la lista y en el push (la misma regla).
// Módulo puro (sin React Native) para poder probarlo con `node --test`.

type Data = Record<string, unknown> | null | undefined;

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Ruta de expo-router, o null si el aviso solo se marca como leído. */
export function notifRoute(type: string, data: Data): string | null {
  const kind = str(data?.kind);
  const postId = str(data?.post_id);
  const rid = str(data?.restaurant_id);

  if (kind === "review_report") return "/admin/reviews";
  if (kind === "restaurant_report") return "/admin/restaurant-reports";
  if (kind === "new_restaurant") return "/admin/restaurants";
  if (kind === "subscription") return "/subscription";
  if (kind === "owner_boost" || kind === "claim_approved" || kind === "suspended" || kind === "reactivated") return "/(owner)";
  if (kind === "community_removed") return postId ? `/community/${postId}` : "/(customer)/community";
  if ((kind === "post" || kind === "post_mention" || type === "post_mention") && postId) return `/community/${postId}`;
  if (rid) return `/restaurant/${rid}`;
  if (kind === "mission" || kind === "streak" || type === "levelup" || type === "mission" || type === "streak") {
    return "/(customer)/profile";
  }
  return null;
}
