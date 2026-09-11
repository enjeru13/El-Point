import { Image } from "expo-image";
import { impact } from "@/lib/haptics";
import { AppLogo } from "@/components/ui/AppLogo";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { RankBadge } from "@/components/ui/RankBadge";
import { Chip } from "@/components/ui/Chip";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { StarBadge } from "@/components/ui/StarBadge";
import {
  useFavoriteIds,
  useFavorites,
  useHomeFeed,
  useToggleFavorite,
  type FeedItem,
} from "@/lib/queries/feed";
import { useCategories } from "@/lib/queries/categories";
import { isBoosted, isFounder } from "@/lib/queries/restaurants";
import { useRestaurantSearch, type SearchResult } from "@/lib/queries/search";
import { QuickPickModal } from "@/components/ui/QuickPickModal";
import { isOpenNow } from "@/lib/hours";
import { useMyProfile } from "@/lib/queries/me";
import { useSettings } from "@/lib/settings";
import { useToast } from "@/lib/toast";
import { distanceKm, fmtKm, type LatLng } from "@/lib/geo";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { TourGuide, type TourStep } from "@/components/tour/TourGuide";
import { capWidth, useIsTablet } from "@/lib/responsive";
import * as Location from "expo-location";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";

// ─── Filtros fijos; el resto sale de la DB (useCategories) ───────────────────

const PINNED: { slug: string; label: string; icon: string }[] = [
  { slug: "all", label: "Todo", icon: "silverware-fork-knife" },
  { slug: "promo", label: "Promos", icon: "tag" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} ${d === 1 ? "día" : "días"}`;
  const w = Math.floor(d / 7);
  return `Hace ${w} ${w === 1 ? "semana" : "semanas"}`;
}

function authorLabel(a: FeedItem["author"]): string {
  return a?.username ? `@${a.username}` : (a?.full_name ?? "Anónimo");
}

// ─── Review card ─────────────────────────────────────────────────────────────

function ReviewCard({
  item,
  favorited,
  compact = false,
  userLoc,
  onToggleFavorite,
}: {
  item: FeedItem;
  favorited: boolean;
  compact?: boolean;
  userLoc?: LatLng | null;
  onToggleFavorite: () => void;
}) {
  const { C, shadow } = useTheme();
  const router = useRouter();
  const cat = item.restaurant.categories[0];
  const promo = item.restaurant.promo_text;
  const r = item.restaurant;
  const dist =
    userLoc && r.lat != null && r.lng != null
      ? fmtKm(distanceKm(userLoc, r.lat, r.lng))
      : null;

  return (
    <Pressable
      onPress={() => router.push(`/restaurant/${item.restaurant.id}`)}
      style={{
        backgroundColor: C.surface,
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: C.border,
        ...shadow.md,
        marginBottom: compact ? 12 : 16,
      }}
    >
      {/* Imagen: portada real o icono */}
      <View
        style={{
          height: compact ? 118 : 180,
          width: "100%",
          backgroundColor: C.primaryFixed,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {item.restaurant.cover_url ? (
          <Image
            source={{ uri: item.restaurant.cover_url }}
            style={{ position: "absolute", width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Icon
            name={cat?.icon ?? "silverware-fork-knife"}
            size={80}
            color={C.primary}
            style={{ opacity: 0.55 }}
          />
        )}

        {/* Rating */}
        <View style={{ position: "absolute", top: 12, right: 12 }}>
          <StarBadge
            rating={item.restaurant.rating_avg}
            count={item.restaurant.rating_count}
          />
        </View>

        {/* PROMO badge */}
        {promo && (
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 99,
              backgroundColor: C.primaryContainer,
              borderWidth: 1,
              borderColor: C.border,
              ...shadow.sm,
            }}
          >
            <Icon name="tag" size={13} color={C.onPrimary} />
            <AppText variant="caption" color={C.onPrimary}>PROMO</AppText>
          </View>
        )}
      </View>

      {/* Contenido */}
      <View style={{ padding: compact ? 12 : 16, gap: compact ? 6 : 10 }}>
        <AppText
          variant="heading"
          style={{ fontSize: compact ? 17 : 20, lineHeight: compact ? 21 : 25 }}
          numberOfLines={1}
        >
          {item.restaurant.name}
        </AppText>

        {(dist || cat || isBoosted(item.restaurant) || isFounder(item.restaurant)) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {isFounder(item.restaurant) && (
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                alignItems: "center", justifyContent: "center",
                backgroundColor: "#f0c26022", borderWidth: 1, borderColor: "#f0c26066",
              }}>
                <Icon name="crown" size={11} color="#b8860b" />
              </View>
            )}
            {isBoosted(item.restaurant) && (
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 3,
                paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99,
                backgroundColor: C.primary + "22", borderWidth: 1, borderColor: C.primary + "55",
              }}>
                <Icon name="fire" size={11} color={C.primary} />
                <AppText variant="caption" color={C.primary} style={{ fontSize: 10 }}>Destacado</AppText>
              </View>
            )}
            {cat && (
              <AppText variant="caption" color={C.outline}>{cat.label}</AppText>
            )}
            {dist && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Icon name="map-marker-distance" size={12} color={C.primary} />
                <AppText variant="caption" color={C.primary}>{dist}</AppText>
              </View>
            )}
          </View>
        )}

        {r.amenities.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {r.amenities.slice(0, 4).map((a) => (
              <View
                key={a.slug}
                style={{
                  width: 26, height: 26, borderRadius: 8,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: C.surfaceContainerLow,
                }}
              >
                <Icon name={a.icon} size={14} color={C.onSurfaceVariant} />
              </View>
            ))}
            {r.amenities.length > 4 && (
              <AppText variant="caption" color={C.outline} style={{ fontSize: 11 }}>
                +{r.amenities.length - 4}
              </AppText>
            )}
          </View>
        )}

        {/* Franja de promo */}
        {promo && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              padding: 10,
              borderRadius: 12,
              backgroundColor: C.primary + "1f",
              borderWidth: 1,
              borderColor: C.primary + "40",
              borderLeftWidth: 5,
              borderLeftColor: C.primary,
            }}
          >
            <Icon name="tag" size={16} color={C.primary} />
            <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
              {promo}
            </AppText>
          </View>
        )}

        {/* Quote */}
        {!compact && (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: C.surfaceContainerLow,
              borderLeftWidth: 3,
              borderLeftColor: C.primary,
            }}
          >
            <AppText
              variant="body"
              color={C.onSurfaceVariant}
              style={{ lineHeight: 22, fontStyle: "italic" }}
              numberOfLines={3}
            >
              "{item.body}"
            </AppText>
          </View>
        )}

        {/* Reviewer */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: C.outlineVariant,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar uri={item.author?.avatar_url} size={36} />
            <View>
              <AppText variant="bodyStrong">{authorLabel(item.author)}</AppText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                <RankBadge level={item.author?.level ?? 1} />
                <AppText variant="caption" color={C.outline}>
                  {timeAgo(item.created_at)}
                </AppText>
              </View>
            </View>
          </View>

          <Pressable
            onPress={onToggleFavorite}
            hitSlop={8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 99,
              backgroundColor: favorited ? C.primary : C.primaryFixed,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Icon
              name={favorited ? "heart" : "heart-outline"}
              size={14}
              color={favorited ? "#fff" : C.primary}
            />
            <AppText variant="bodyStrong" color={favorited ? "#fff" : C.primary}>
              Me gusta
            </AppText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Favorito compacto ──────────────────────────────────────────────────────

function FavoriteRow({
  id,
  name,
  address,
  rating,
  ratingCount,
  icon,
  cover,
  lat,
  lng,
  userLoc,
}: {
  id: string;
  name: string;
  address: string | null;
  rating: number;
  ratingCount: number;
  icon: string;
  cover: string | null;
  lat: number | null;
  lng: number | null;
  userLoc?: LatLng | null;
}) {
  const { C, shadow } = useTheme();
  const router = useRouter();
  const dist =
    userLoc && lat != null && lng != null
      ? fmtKm(distanceKm(userLoc, lat, lng))
      : null;
  return (
    <Pressable
      onPress={() => router.push(`/restaurant/${id}`)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 18,
        marginBottom: 10,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        ...shadow.sm,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: C.primaryFixed,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
        ) : (
          <Icon name={icon} size={24} color={C.primary} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {name}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 1 }}>
          {dist && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Icon name="map-marker-distance" size={11} color={C.primary} />
              <AppText variant="caption" color={C.primary}>{dist}</AppText>
            </View>
          )}
          {dist && address && (
            <AppText variant="caption" color={C.outlineVariant}>·</AppText>
          )}
          {address && (
            <AppText variant="caption" color={C.outline} numberOfLines={1} style={{ flex: 1 }}>
              {address}
            </AppText>
          )}
        </View>
      </View>
      <StarBadge rating={rating} count={ratingCount} size="sm" />
    </Pressable>
  );
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { C, shadow } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const toast = useToast();

  const feedQ = useHomeFeed();
  const favIdsQ = useFavoriteIds();
  const favoritesQ = useFavorites();
  const toggleFav = useToggleFavorite();
  const profileQ = useMyProfile();
  const categoriesQ = useCategories();

  const { compactCards, showDistance } = useSettings();
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ranks" | "favorites">("ranks");
  const [refreshing, setRefreshing] = useState(false);
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);

  // "¿Qué comer hoy?" — random pick out of every active restaurant, open-now
  // ones first if there are any. The modal owns the reveal animation; here
  // we just decide the real pick right away.
  const searchQ = useRestaurantSearch();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickPool, setPickPool] = useState<SearchResult[]>([]);
  const [picked, setPicked] = useState<SearchResult | null>(null);

  function rollQuickPick() {
    const all = searchQ.data ?? [];
    if (all.length === 0) return;
    const open = all.filter((r) => isOpenNow(r.hours).open);
    const pool = open.length > 0 ? open : all;
    setPickPool(pool);
    setPicked(null);
    // A tick later so the modal sees the null->result transition and rolls
    // the animation, even on a re-roll from the same pool.
    setTimeout(() => setPicked(pool[Math.floor(Math.random() * pool.length)]), 20);
  }

  function openQuickPick() {
    if ((searchQ.data ?? []).length === 0) {
      toast.error(
        searchQ.isLoading ? "Un momento, cargando locales…" : "No encontramos locales todavía",
      );
      return;
    }
    impact("light");
    setPickerOpen(true);
    rollQuickPick();
  }

  // Coach-mark targets for the first-use tour.
  const tourSearchRef = useRef<View>(null);
  const tourChipsRef = useRef<View>(null);
  const tourTabsRef = useRef<View>(null);
  const tourBellRef = useRef<View>(null);
  const tourSteps: TourStep[] = [
    { ref: tourSearchRef, icon: "magnify", title: "Busca lo que se te antoje", text: "Escribe un plato, un tipo de comida o el nombre del local y aparece al toque." },
    { ref: tourChipsRef, icon: "silverware-fork-knife", title: "Filtra por categoría", text: "Toca cualquier chip para ver solo esa categoría, o \"Promos\" para las ofertas activas." },
    { ref: tourTabsRef, icon: "star-outline", title: "Últimos ranks o tus favoritos", text: "Cambia entre lo que la gente está calificando ahora y los locales que ya guardaste." },
    { ref: tourBellRef, icon: "bell-outline", title: "Tus notificaciones", text: "Aquí llegan tus subidas de nivel, respuestas a tus reseñas y promos cerca de ti." },
  ];

  const firstName = profileQ.data?.full_name?.trim().split(/\s+/)[0];
  const greetName = profileQ.data?.username
    ? `@${profileQ.data.username}`
    : firstName || "Comensal";

  // Distance is opt-in; never prompt from the feed — only use a grant made elsewhere.
  useEffect(() => {
    if (!showDistance) { setUserLoc(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) return;
        const pos =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
        if (!cancelled && pos) {
          setUserLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [showDistance]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        feedQ.refetch(),
        favIdsQ.refetch(),
        favoritesQ.refetch(),
        profileQ.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const favIds = favIdsQ.data ?? new Set<string>();
  const feed = feedQ.data ?? [];

  // Categorías favoritas del usuario (ids -> slugs) para ordenar el feed.
  const prefIds = new Set(profileQ.data?.favorite_categories ?? []);
  const prefSlugs = new Set(
    (categoriesQ.data ?? []).filter((c) => prefIds.has(c.id)).map((c) => c.slug),
  );

  const q = query.trim().toLowerCase();
  const matchQuery = (r: FeedItem["restaurant"]) =>
    !q ||
    r.name.toLowerCase().includes(q) ||
    r.categories.some((c) => c.label.toLowerCase().includes(q)) ||
    (r.address ?? "").toLowerCase().includes(q);

  const filtered = feed
    .filter((item) => {
      if (!matchQuery(item.restaurant)) return false;
      if (activeCategory === "promo") return !!item.restaurant.promo_text;
      if (activeCategory === "all") return true;
      return item.restaurant.categories.some((c) => c.slug === activeCategory);
    })
    .sort((a, b) => {
      // Destacados primero siempre, en cualquier categoría.
      const boostDiff = (isBoosted(b.restaurant) ? 1 : 0) - (isBoosted(a.restaurant) ? 1 : 0);
      if (boostDiff !== 0) return boostDiff;
      // El resto del orden (preferencias) solo aplica en "Todo"; respeta
      // recencia dentro de cada grupo.
      if (activeCategory !== "all" || prefSlugs.size === 0) return 0;
      const am = a.restaurant.categories.some((c) => prefSlugs.has(c.slug)) ? 0 : 1;
      const bm = b.restaurant.categories.some((c) => prefSlugs.has(c.slug)) ? 0 : 1;
      return am - bm;
    });

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* ── Header ── */}
      <ScreenHeader
        left={<AppLogo />}
        right={
          <View ref={tourBellRef} collapsable={false}>
            <NotificationBell />
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96, ...capWidth(isTablet) }}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* ── 0: Saludo + búsqueda ── */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 4,
            gap: 14,
          }}
        >
          <AppText variant="title" style={{ fontSize: 26, lineHeight: 31 }}>
            ¡Hola, {greetName}! 👋
          </AppText>

          <View ref={tourSearchRef} collapsable={false}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery("")}
              placeholder="Encuentra tu próximo antojo..."
              variant="floating"
            />
          </View>

          <Pressable
            onPress={openQuickPick}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 16,
              backgroundColor: C.primary,
              ...shadow.primary,
            }}
          >
            <View
              style={{
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon name="dice-5-outline" size={18} color="#fff" />
            </View>
            <AppText variant="bodyStrong" color="#fff" style={{ flex: 1 }}>
              ¿Qué comer hoy?
            </AppText>
            <Icon name="arrow-right" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* ── 1: Filtros pegajosos (categorías + tabs) ── */}
        <View style={{ backgroundColor: C.background }}>
          <View ref={tourChipsRef} collapsable={false}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                gap: 8,
              }}
            >
              {[...PINNED, ...(categoriesQ.data ?? [])].map((cat) => (
                <Chip
                  key={cat.slug}
                  label={cat.label}
                  icon={cat.icon}
                  active={activeCategory === cat.slug}
                  onPress={() => setActiveCategory(cat.slug)}
                />
              ))}
            </ScrollView>
          </View>

          <View
            ref={tourTabsRef}
            collapsable={false}
            style={{
              flexDirection: "row",
              paddingHorizontal: 20,
              gap: 24,
              borderBottomWidth: 1,
              borderBottomColor: C.outlineVariant,
            }}
          >
            {(
              [
                { key: "ranks", label: "Últimos Ranks" },
                { key: "favorites", label: "Tus Favoritos" },
              ] as const
            ).map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  paddingBottom: 10,
                  paddingTop: 4,
                  borderBottomWidth: 3,
                  borderBottomColor:
                    activeTab === tab.key ? C.primary : "transparent",
                  marginBottom: -2,
                }}
              >
                <AppText
                  variant="heading"
                  color={activeTab === tab.key ? C.primary : C.outline}
                >
                  {tab.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── 2: Feed ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {activeTab === "favorites" ? (
            favoritesQ.isLoading ? (
              <SkeletonList count={4} kind="row" />
            ) : (favoritesQ.data ?? []).filter((f) =>
                !q ||
                f.name.toLowerCase().includes(q) ||
                f.categories.some((c) => c.label.toLowerCase().includes(q)) ||
                (f.address ?? "").toLowerCase().includes(q),
              ).length === 0 ? (
              <EmptyState
                icon="heart-outline"
                title={q ? "Sin coincidencias" : "Sin favoritos aún"}
                body={
                  q
                    ? "Ningún favorito coincide con tu búsqueda."
                    : 'Toca "Me gusta" en las reseñas que más te gusten para guardarlas aquí.'
                }
                actionLabel={q ? undefined : "Explorar lugares"}
                onAction={q ? undefined : () => setActiveTab("ranks")}
              />
            ) : (
              (favoritesQ.data ?? [])
                .filter((f) =>
                  !q ||
                  f.name.toLowerCase().includes(q) ||
                  f.categories.some((c) => c.label.toLowerCase().includes(q)) ||
                  (f.address ?? "").toLowerCase().includes(q),
                )
                .map((f) => (
                <FavoriteRow
                  key={f.id}
                  id={f.id}
                  name={f.name}
                  address={f.address}
                  rating={f.rating_avg}
                  ratingCount={f.rating_count}
                  icon={f.categories[0]?.icon ?? "silverware-fork-knife"}
                  cover={f.cover_url}
                  lat={f.lat}
                  lng={f.lng}
                  userLoc={userLoc}
                />
              ))
            )
          ) : feedQ.isLoading ? (
            <SkeletonList count={3} kind="card" />
          ) : feedQ.isError ? (
            <EmptyState
              icon="food-off-outline"
              title="No pudimos cargar el feed"
              body="Revisa tu conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => feedQ.refetch()}
            />
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                favorited={favIds.has(item.restaurant.id)}
                compact={compactCards}
                userLoc={userLoc}
                onToggleFavorite={() => {
                  impact("light");
                  toggleFav.mutate({
                    restaurantId: item.restaurant.id,
                    favorited: favIds.has(item.restaurant.id),
                  });
                }}
              />
            ))
          ) : feed.length === 0 ? (
            <EmptyState
              icon="food-off-outline"
              title="Todavía no hay ranks"
              body="Sé el primero: abre un lugar y deja tu rank."
            />
          ) : (
            <EmptyState
              icon="food-off-outline"
              title="Nada en esta categoría"
              body="Prueba otra categoría o quita el filtro."
              actionLabel="Ver todo"
              onAction={() => setActiveCategory("all")}
            />
          )}
        </View>
      </ScrollView>

      <TourGuide tourKey="home" ready={!feedQ.isLoading} steps={tourSteps} />

      <QuickPickModal
        visible={pickerOpen}
        pool={pickPool}
        result={picked}
        onReroll={rollQuickPick}
        onGo={() => {
          if (!picked) return;
          setPickerOpen(false);
          router.push(`/restaurant/${picked.id}`);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
