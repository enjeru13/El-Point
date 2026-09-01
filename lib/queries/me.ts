import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type MyProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  level: number;
  xp: number;
  search_radius_km: number;
  settings: Record<string, boolean>;
  created_at: string;
};

async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio, level, xp, search_radius_km, settings, created_at')
    .eq('id', uid)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ...(data as any), settings: ((data as any).settings ?? {}) as Record<string, boolean> };
}

export function useMyProfile() {
  return useQuery({ queryKey: ['my-profile'], queryFn: fetchMyProfile });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, boolean>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No autenticado');
      const current = qc.getQueryData<MyProfile | null>(['my-profile'])?.settings ?? {};
      const merged = { ...current, ...patch };
      const { error } = await supabase.from('profiles').update({ settings: merged }).eq('id', userData.user.id);
      if (error) throw error;
      return merged;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ['my-profile'] });
      const prev = qc.getQueryData<MyProfile | null>(['my-profile']);
      if (prev) qc.setQueryData(['my-profile'], { ...prev, settings: { ...prev.settings, ...patch } });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(['my-profile'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['my-profile'] }),
  });
}

export type MyProfilePatch = Partial<{
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}>;

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: MyProfilePatch) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No autenticado');
      const { error } = await supabase.from('profiles').update(patch).eq('id', userData.user.id);
      if (error) {
        if (error.code === '23505') throw new Error('Ese nombre de usuario ya está en uso.');
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

export type MyReview = {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  restaurant: { id: string; name: string; icon: string } | null;
};

async function fetchMyReviews(): Promise<MyReview[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `id, rating, body, created_at,
       restaurant:restaurants!restaurant_id (
         id, name, restaurant_categories ( categories ( icon ) )
       )`,
    )
    .eq('author_id', uid)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    restaurant: r.restaurant
      ? {
          id: r.restaurant.id,
          name: r.restaurant.name,
          icon: r.restaurant.restaurant_categories?.[0]?.categories?.icon ?? 'silverware-fork-knife',
        }
      : null,
  }));
}

export function useMyReviews() {
  return useQuery({ queryKey: ['my-reviews'], queryFn: fetchMyReviews });
}

// Simple placeholder progression until real gamification rules exist.
export function levelProgress(level: number, xp: number) {
  const perLevel = 1000;
  const floor = (level - 1) * perLevel;
  const next = level * perLevel;
  const pct = Math.max(0, Math.min(1, (xp - floor) / perLevel));
  return { next, pct };
}
