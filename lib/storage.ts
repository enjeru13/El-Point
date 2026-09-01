import { supabase } from '@/lib/supabase';

const BUCKET = 'restaurant-media';

async function uploadFile(path: string, uri: string, contentType: string): Promise<string> {
  const res = await fetch(uri);
  const buf = await res.arrayBuffer();

  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // cache-bust so overwritten files show immediately
  return `${data.publicUrl}?v=${Date.now()}`;
}

function imageContentType(uri: string): string {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/** kind = 'logo' | 'cover'. Fixed object name per kind → no orphans on re-upload. */
export function uploadRestaurantImage(restaurantId: string, kind: 'logo' | 'cover', uri: string) {
  return uploadFile(`${restaurantId}/${kind}`, uri, imageContentType(uri));
}

export function uploadRestaurantMenu(restaurantId: string, uri: string) {
  return uploadFile(`${restaurantId}/menu`, uri, 'application/pdf');
}

async function uploadToBucket(bucket: string, path: string, uri: string, contentType: string): Promise<string> {
  const res = await fetch(uri);
  const buf = await res.arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, buf, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export function uploadAvatar(userId: string, uri: string) {
  return uploadToBucket('avatars', `${userId}/avatar`, uri, imageContentType(uri));
}

/** Returns the bucket-relative storage path (not a URL). */
export async function uploadReviewPhoto(reviewId: string, index: number, uri: string): Promise<string> {
  const path = `${reviewId}/${index}`;
  const res = await fetch(uri);
  const buf = await res.arrayBuffer();
  const { error } = await supabase.storage
    .from('review-photos')
    .upload(path, buf, { contentType: imageContentType(uri), upsert: true });
  if (error) throw error;
  return path;
}

export function reviewPhotoUrl(storagePath: string): string {
  return supabase.storage.from('review-photos').getPublicUrl(storagePath).data.publicUrl;
}
