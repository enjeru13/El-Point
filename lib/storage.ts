import { supabase } from "@/lib/supabase";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const RESTAURANT_BUCKET = "restaurant-media";

/** Resize + JPEG-compress before upload. Falls back to the original on failure. */
async function compressImage(uri: string, maxWidth = 1600): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: maxWidth });
    const rendered = await ctx.renderAsync();
    const out = await rendered.saveAsync({
      compress: 0.7,
      format: SaveFormat.JPEG,
    });
    return out.uri;
  } catch {
    return uri;
  }
}

async function putImage(
  bucket: string,
  path: string,
  uri: string,
): Promise<string> {
  const small = await compressImage(uri);
  const res = await fetch(small);
  const buf = await res.arrayBuffer();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buf, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}

async function publicUrl(
  bucket: string,
  path: string,
  bust = false,
): Promise<string> {
  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return bust ? `${url}?v=${Date.now()}` : url;
}

// ─── Restaurant media ───────────────────────────────────────────────────────

/** kind = 'logo' | 'cover'. Fixed name per kind → no orphans on re-upload. */
export async function uploadRestaurantImage(
  restaurantId: string,
  kind: "logo" | "cover",
  uri: string,
) {
  await putImage(RESTAURANT_BUCKET, `${restaurantId}/${kind}`, uri);
  return publicUrl(RESTAURANT_BUCKET, `${restaurantId}/${kind}`, true);
}

export async function uploadRestaurantMenu(restaurantId: string, uri: string) {
  const path = `${restaurantId}/menu`;
  const res = await fetch(uri);
  const buf = await res.arrayBuffer();
  const { error } = await supabase.storage
    .from(RESTAURANT_BUCKET)
    .upload(path, buf, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  return publicUrl(RESTAURANT_BUCKET, path, true);
}

// ─── Restaurant verification (private bucket) ───────────────────────────────

const VERIFICATION_BUCKET = "restaurant-verification";

/**
 * Facade photo used by admins to verify the place is real.
 * Path: "<ownerId>/<restaurantId>/facade" — matches the bucket's RLS
 * (first folder must be the uploader's uid). Returns the storage path.
 */
export async function uploadRestaurantVerification(
  ownerId: string,
  restaurantId: string,
  uri: string,
): Promise<string> {
  const path = `${ownerId}/${restaurantId}/facade`;
  return putImage(VERIFICATION_BUCKET, path, uri);
}

/** Short-lived URL so an admin can view a private verification photo. */
export async function verificationPhotoUrl(
  storagePath: string,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

// ─── Avatars ────────────────────────────────────────────────────────────────

export async function uploadAvatar(userId: string, uri: string) {
  await putImage("avatars", `${userId}/avatar`, uri);
  return publicUrl("avatars", `${userId}/avatar`, true);
}

// ─── Review photos ──────────────────────────────────────────────────────────

/** Returns the bucket-relative storage path (not a URL). */
export function uploadReviewPhoto(
  reviewId: string,
  index: number,
  uri: string,
): Promise<string> {
  return putImage("review-photos", `${reviewId}/${index}`, uri);
}

export function reviewPhotoUrl(storagePath: string): string {
  return supabase.storage.from("review-photos").getPublicUrl(storagePath).data
    .publicUrl;
}
