import { hasPlan } from "@/lib/plan";
import { activePromo } from "@/lib/promo";
import type { RestaurantAmenity, RestaurantCategory } from "@/lib/queries/restaurants";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type FeedRestaurant = {
  id: string;
  name: string;
  address: string | null;
  rating_avg: number;
  rating_count: number;
  price_level: number | null;
  promo_text: string | null;
  cover_url: string | null;
  lat: number | null;
  lng: number | null;
  boost_until: string | null;
  founder_rank: number | null;
  has_plan: boolean;
  ghost_kitchen: boolean;
  zone_label: string | null;
  categories: RestaurantCategory[];
  amenities: RestaurantAmenity[];
};

export type FeedItem = {
  id: string;
  /** Local aún sin reseñas: sale en el Inicio como "Nuevo en El Point". */
  isNew?: boolean;
  rating: number;
  body: string;
  created_at: string;
  restaurant: FeedRestaurant;
  author: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    level: number;
  } | null;
};

function mapCategories(rc: any): RestaurantCategory[] {
  return (rc ?? []).map((row: any) => row.categories).filter(Boolean);
}

function mapAmenities(ra: any): RestaurantAmenity[] {
  return (ra ?? []).map((row: any) => row.amenities).filter(Boolean);
}

function num(v: any): number | null {
  return typeof v === "number" ? v : null;
}

const RESTAURANT_EMBED = `restaurant:restaurants (
  id, name, address, rating_avg, rating_count, price_level, promo_text, promo_ends_at, cover_url, latitude, longitude, boost_until, founder_rank, paid_until, ghost_kitchen, zone_label,
  restaurant_categories ( categories ( slug, label, icon ) ),
  restaurant_amenities ( amenities ( id, slug, label, icon ) )
)`;

// ─── Home feed: recent reviews ───────────────────────────────────────────────

async function fetchFeed(): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id, rating, body, created_at, ${RESTAURANT_EMBED},
       author:profiles!author_id ( username, full_name, avatar_url, level )`,
    )
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) throw error;

  const mapped: FeedItem[] = (data ?? [])
    .filter((r: any) => r.restaurant)
    .map((r: any) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      author: r.author ?? null,
      restaurant: {
        id: r.restaurant.id,
        name: r.restaurant.name,
        address: r.restaurant.address,
        rating_avg: r.restaurant.rating_avg,
        rating_count: r.restaurant.rating_count,
        price_level: num(r.restaurant.price_level),
        promo_text: hasPlan(r.restaurant) ? activePromo(r.restaurant) : null,
        cover_url: hasPlan(r.restaurant) ? (r.restaurant.cover_url ?? null) : null,
        lat: num(r.restaurant.latitude),
        lng: num(r.restaurant.longitude),
        boost_until: hasPlan(r.restaurant) ? (r.restaurant.boost_until ?? null) : null,
        founder_rank: r.restaurant.founder_rank ?? null,
        has_plan: hasPlan(r.restaurant),
        ghost_kitchen: !!r.restaurant.ghost_kitchen,
        zone_label: r.restaurant.zone_label ?? null,
        categories: mapCategories(r.restaurant.restaurant_categories),
        amenities: hasPlan(r.restaurant) ? mapAmenities(r.restaurant.restaurant_amenities) : [],
      },
    }));

  // Una card por local: el rank más reciente (data ya viene ordenada desc).
  const seen = new Set<string>();
  const withReviews = mapped.filter((item) => {
    if (seen.has(item.restaurant.id)) return false;
    seen.add(item.restaurant.id);
    return true;
  });

  // Los locales sin reseñas también salen en el Inicio, como "Nuevo en El Point":
  // si no, un local recién registrado sería invisible hasta que alguien lo rankee.
  const { data: fresh } = await supabase
    .from("restaurants")
    .select(
      `id, name, address, rating_avg, rating_count, price_level, promo_text, promo_ends_at, cover_url, latitude, longitude, boost_until, founder_rank, paid_until, ghost_kitchen, zone_label, created_at,
       restaurant_categories ( categories ( slug, label, icon ) ),
       restaurant_amenities ( amenities ( id, slug, label, icon ) )`,
    )
    .eq("status", "approved")
    .eq("is_active", true)
    .eq("rating_count", 0)
    .order("created_at", { ascending: false })
    .limit(20);

  const newItems: FeedItem[] = (fresh ?? [])
    .filter((r: any) => !seen.has(r.id))
    .map((r: any) => ({
      id: `new-${r.id}`,
      isNew: true,
      rating: 0,
      body: "",
      created_at: r.created_at,
      author: null,
      restaurant: {
        id: r.id,
        name: r.name,
        address: r.address,
        rating_avg: r.rating_avg,
        rating_count: r.rating_count,
        price_level: num(r.price_level),
        promo_text: hasPlan(r) ? activePromo(r) : null,
        cover_url: hasPlan(r) ? (r.cover_url ?? null) : null,
        lat: num(r.latitude),
        lng: num(r.longitude),
        boost_until: hasPlan(r) ? (r.boost_until ?? null) : null,
        founder_rank: r.founder_rank ?? null,
        has_plan: hasPlan(r),
        ghost_kitchen: !!r.ghost_kitchen,
        zone_label: r.zone_label ?? null,
        categories: mapCategories(r.restaurant_categories),
        amenities: hasPlan(r) ? mapAmenities(r.restaurant_amenities) : [],
      },
    }));

  return [...withReviews, ...newItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function useHomeFeed() {
  return useQuery({ queryKey: ["home-feed"], queryFn: fetchFeed });
}

// ─── Favorites ──────────────────────────────────────────────────────────────

export type FavoriteRestaurant = FeedRestaurant & { favorited_at: string };

async function fetchFavorites(): Promise<FavoriteRestaurant[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select(`created_at, ${RESTAURANT_EMBED}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter((f: any) => f.restaurant)
    .map((f: any) => ({
      id: f.restaurant.id,
      name: f.restaurant.name,
      address: f.restaurant.address,
      rating_avg: f.restaurant.rating_avg,
      rating_count: f.restaurant.rating_count,
      price_level: num(f.restaurant.price_level),
      promo_text: hasPlan(f.restaurant) ? activePromo(f.restaurant) : null,
      cover_url: hasPlan(f.restaurant) ? (f.restaurant.cover_url ?? null) : null,
      lat: num(f.restaurant.latitude),
      lng: num(f.restaurant.longitude),
      boost_until: hasPlan(f.restaurant) ? (f.restaurant.boost_until ?? null) : null,
      founder_rank: f.restaurant.founder_rank ?? null,
      has_plan: hasPlan(f.restaurant),
      ghost_kitchen: !!f.restaurant.ghost_kitchen,
      zone_label: f.restaurant.zone_label ?? null,
      categories: mapCategories(f.restaurant.restaurant_categories),
      amenities: hasPlan(f.restaurant) ? mapAmenities(f.restaurant.restaurant_amenities) : [],
      favorited_at: f.created_at,
    }));
}

export function useFavorites() {
  return useQuery({ queryKey: ["favorites"], queryFn: fetchFavorites });
}

export function useFavoriteIds() {
  return useQuery({
    queryKey: ["favorite-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("restaurant_id");
      if (error) throw error;
      return new Set((data ?? []).map((f) => f.restaurant_id));
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      favorited,
    }: {
      restaurantId: string;
      favorited: boolean;
    }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user)
        throw userErr ?? new Error("No autenticado");
      const userId = userData.user.id;

      if (favorited) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("restaurant_id", restaurantId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: userId, restaurant_id: restaurantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorite-ids"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
