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
