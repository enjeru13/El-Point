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
import {
  useFavoriteIds,
  useFavorites,
  useHomeFeed,
  useToggleFavorite,
  type FeedItem,
} from "@/lib/queries/feed";
import { useCategories } from "@/lib/queries/categories";
import { useMyProfile } from "@/lib/queries/me";
import { useSettings } from "@/lib/settings";
import { distanceKm, fmtKm, type LatLng } from "@/lib/geo";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import * as Location from "expo-location";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
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
        borderWidth: 2,
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
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 99,
            backgroundColor: C.secondaryContainer,
            borderWidth: 2,
            borderColor: C.border,
          }}
        >
          <Icon name="star" size={14} color={C.secondary} />
          <AppText variant="bodyStrong" color={C.secondary}>
            {item.restaurant.rating_count > 0
              ? item.restaurant.rating_avg.toFixed(1)
              : "Nuevo"}
          </AppText>
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
              borderWidth: 2,
              borderColor: C.border,
              ...shadow.sm,
            }}
          >
            <Icon name="tag" size={13} color={C.onSurface} />
            <AppText variant="caption">PROMO</AppText>
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

        {(dist || cat) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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

        {/* Franja de promo */}
        {promo && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              padding: 10,
              borderRadius: 12,
              backgroundColor: C.primaryFixed,
              borderWidth: 2,
              borderColor: C.border,
              borderLeftWidth: 5,
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
              borderWidth: 2,
              borderColor: C.border,
            }}
          >
            <Icon
              name={favorited ? "heart" : "heart-outline"}
              size={14}
              color={favorited ? "#fff" : C.primary}
            />
            <AppText variant="bodyStrong" color={favorited ? "#fff" : C.primary}>
              Me sirve
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
  icon,
  cover,
}: {
  id: string;
  name: string;
  address: string | null;
  rating: number;
  icon: string;
  cover: string | null;
}) {
  const { C, shadow } = useTheme();
  const router = useRouter();
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
        borderWidth: 2,
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
          borderWidth: 2,
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
        {address && (
          <AppText variant="caption" color={C.outline} numberOfLines={1}>
            {address}
          </AppText>
        )}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        <Icon name="star" size={13} color={C.secondary} />
        <AppText variant="label">{rating > 0 ? rating.toFixed(1) : "–"}</AppText>
      </View>
    </Pressable>
  );
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { C, shadow } = useTheme();
  const router = useRouter();

  const feedQ = useHomeFeed();
  const favIdsQ = useFavoriteIds();
  const favoritesQ = useFavorites();
  const toggleFav = useToggleFavorite();
  const profileQ = useMyProfile();
  const categoriesQ = useCategories();

  const { compactCards, showDistance } = useSettings();
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"ranks" | "favorites">("ranks");
  const [refreshing, setRefreshing] = useState(false);
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);

  const firstName = profileQ.data?.full_name?.trim().split(/\s+/)[0];
  const greetName = firstName || profileQ.data?.username || "Comensal";

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

  const filtered = feed
    .filter((item) => {
      if (activeCategory === "promo") return !!item.restaurant.promo_text;
      if (activeCategory === "all") return true;
      return item.restaurant.categories.some((c) => c.slug === activeCategory);
    })
    .sort((a, b) => {
      // Solo re-ordena en "Todo"; respeta recencia dentro de cada grupo.
      if (activeCategory !== "all" || prefSlugs.size === 0) return 0;
      const am = a.restaurant.categories.some((c) => prefSlugs.has(c.slug)) ? 0 : 1;
      const bm = b.restaurant.categories.some((c) => prefSlugs.has(c.slug)) ? 0 : 1;
      return am - bm;
    });

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      {/* ── Header ── */}
      <ScreenHeader left={<AppLogo />} right={<NotificationBell />} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* ── Saludo + búsqueda ── */}
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

          <Pressable onPress={() => router.push("/(customer)/search")}>
            <View pointerEvents="none">
              <SearchBar
                value=""
                onChangeText={() => {}}
                placeholder="Encuentra tu próximo antojo..."
                variant="floating"
              />
            </View>
          </Pressable>
        </View>

        {/* ── Categorías scroll horizontal ── */}
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

        {/* ── Tabs ── */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            gap: 24,
            borderBottomWidth: 2,
            borderBottomColor: C.outlineVariant,
            marginBottom: 16,
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

        {/* ── Feed ── */}
        <View style={{ paddingHorizontal: 20 }}>
          {activeTab === "favorites" ? (
            favoritesQ.isLoading ? (
              <SkeletonList count={4} kind="row" />
            ) : (favoritesQ.data ?? []).length === 0 ? (
              <EmptyState
                icon="heart-outline"
                title="Sin favoritos aún"
                body='Marca "Me sirve" en las reseñas que más te gusten para guardarlas aquí.'
                actionLabel="Explorar lugares"
                onAction={() => setActiveTab("ranks")}
              />
            ) : (
              (favoritesQ.data ?? []).map((f) => (
                <FavoriteRow
                  key={f.id}
                  id={f.id}
                  name={f.name}
                  address={f.address}
                  rating={f.rating_avg}
                  icon={f.categories[0]?.icon ?? "silverware-fork-knife"}
                  cover={f.cover_url}
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
    </View>
  );
}
