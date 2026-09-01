import { Image } from "expo-image";
import { AppLogo } from "@/components/ui/AppLogo";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
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
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// ─── Categorías (slug = id, alineado con la DB) ──────────────────────────────

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "all", label: "Todo", icon: "silverware-fork-knife" },
  { id: "promo", label: "Promos", icon: "tag" },
  { id: "burgers", label: "Burgers", icon: "hamburger" },
  { id: "pizza", label: "Pizza", icon: "pizza" },
  { id: "hotdogs", label: "Hot Dogs", icon: "food-hot-dog" },
  { id: "arepas", label: "Arepas", icon: "corn" },
  { id: "fastfood", label: "Rápida", icon: "food-variant" },
  { id: "coffee", label: "Café", icon: "coffee" },
  { id: "desserts", label: "Postres", icon: "ice-cream" },
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
  onToggleFavorite,
}: {
  item: FeedItem;
  favorited: boolean;
  onToggleFavorite: () => void;
}) {
  const { C, shadow } = useTheme();
  const router = useRouter();
  const cat = item.restaurant.categories[0];
  const promo = item.restaurant.promo_text;

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
        marginBottom: 16,
      }}
    >
      {/* Imagen: portada real o icono */}
      <View
        style={{
          height: 180,
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
          <Text
            style={{
              color: C.secondary,
              fontFamily: "PlusJakartaSans_700Bold",
              fontSize: 15,
            }}
          >
            {item.rating.toFixed(1)}
          </Text>
        </View>

        {/* Etiquetas arriba-izquierda: PROMO + categoría */}
        <View
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          {promo && (
            <View
              style={{
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
              <Text
                style={{
                  color: C.onSurface,
                  fontFamily: "Outfit_700Bold",
                  fontSize: 13,
                  letterSpacing: 0.5,
                }}
              >
                PROMO
              </Text>
            </View>
          )}
          {cat && (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 99,
                backgroundColor: C.surface,
                borderWidth: 2,
                borderColor: C.border,
              }}
            >
              <Text
                style={{
                  color: C.onSurface,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  fontSize: 15,
                }}
              >
                {cat.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Contenido */}
      <View style={{ padding: 16, gap: 10 }}>
        <Text
          style={{
            color: C.onSurface,
            fontFamily: "Outfit_700Bold",
            fontSize: 20,
          }}
        >
          {item.restaurant.name}
        </Text>

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
            <Text
              style={{
                flex: 1,
                color: C.onSurface,
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 15,
              }}
              numberOfLines={2}
            >
              {promo}
            </Text>
          </View>
        )}

        {/* Quote */}
        <View
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: C.surfaceContainerLow,
            borderLeftWidth: 3,
            borderLeftColor: C.primary,
          }}
        >
          <Text
            style={{
              color: C.onSurfaceVariant,
              fontFamily: "PlusJakartaSans_400Regular",
              fontSize: 15,
              lineHeight: 22,
              fontStyle: "italic",
            }}
            numberOfLines={3}
          >
            "{item.body}"
          </Text>
        </View>

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
              <Text
                style={{
                  color: C.onSurface,
                  fontFamily: "PlusJakartaSans_700Bold",
                  fontSize: 15,
                }}
              >
                {authorLabel(item.author)}
              </Text>
              <View
                style={{
                  marginTop: 2,
                  alignSelf: "flex-start",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 99,
                  backgroundColor: C.primaryFixed,
                }}
              >
                <Text
                  style={{
                    color: C.primary,
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 15,
                  }}
                >
                  Nivel {item.author?.level ?? 1} · {timeAgo(item.created_at)}
                </Text>
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
            <Text
              style={{
                color: favorited ? "#fff" : C.primary,
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 15,
              }}
            >
              Me sirve
            </Text>
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
        <Text
          style={{
            color: C.onSurface,
            fontFamily: "PlusJakartaSans_700Bold",
            fontSize: 15,
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
        {address && (
          <Text
            style={{
              color: C.outline,
              fontFamily: "PlusJakartaSans_400Regular",
              fontSize: 12,
            }}
            numberOfLines={1}
          >
            {address}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        <Icon name="star" size={13} color={C.secondary} />
        <Text
          style={{
            color: C.onSurface,
            fontFamily: "PlusJakartaSans_700Bold",
            fontSize: 13,
          }}
        >
          {rating > 0 ? rating.toFixed(1) : "–"}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { C, shadow } = useTheme();

  const feedQ = useHomeFeed();
  const favIdsQ = useFavoriteIds();
  const favoritesQ = useFavorites();
  const toggleFav = useToggleFavorite();
  const profileQ = useMyProfile();
  const categoriesQ = useCategories();

  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"ranks" | "favorites">("ranks");
  const [search, setSearch] = useState("");

  const favIds = favIdsQ.data ?? new Set<string>();
  const feed = feedQ.data ?? [];

  // Categorías favoritas del usuario (ids -> slugs) para ordenar el feed.
  const prefIds = new Set(profileQ.data?.favorite_categories ?? []);
  const prefSlugs = new Set(
    (categoriesQ.data ?? []).filter((c) => prefIds.has(c.id)).map((c) => c.slug),
  );

  const filtered = feed
    .filter((item) => {
      if (activeCategory === "promo") {
        if (!item.restaurant.promo_text) return false;
      } else if (
        activeCategory !== "all" &&
        !item.restaurant.categories.some((c) => c.slug === activeCategory)
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.restaurant.name.toLowerCase().includes(q) ||
          item.body.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Solo re-ordena en "Todo" y sin búsqueda; respeta recencia dentro de cada grupo.
      if (activeCategory !== "all" || search.trim() || prefSlugs.size === 0) return 0;
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
          <Text
            style={{
              color: C.onSurface,
              fontFamily: "Outfit_700Bold",
              fontSize: 26,
            }}
          >
            ¡Hola, Comensal! 👋
          </Text>

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Encuentra tu próximo antojo..."
            variant="floating"
          />
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
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 99,
                  borderWidth: 2,
                  borderColor: active ? C.border : C.outlineVariant,
                  backgroundColor: active ? C.primary : C.surface,
                  ...(active ? shadow.primary : {}),
                }}
              >
                <Icon
                  name={cat.icon}
                  size={16}
                  color={active ? "#fff" : C.onSurfaceVariant}
                />
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 15,
                    color: active ? "#fff" : C.onSurface,
                  }}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
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
              <Text
                style={{
                  fontFamily: "Outfit_700Bold",
                  fontSize: 18,
                  color: activeTab === tab.key ? C.primary : C.outline,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Feed ── */}
        <View style={{ paddingHorizontal: 20 }}>
          {activeTab === "favorites" ? (
            favoritesQ.isLoading ? (
              <View style={{ paddingVertical: 48 }}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : (favoritesQ.data ?? []).length === 0 ? (
              <View
                style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}
              >
                <Icon name="heart-outline" size={48} color={C.outline} />
                <Text
                  style={{
                    color: C.onSurfaceVariant,
                    fontFamily: "Outfit_700Bold",
                    fontSize: 18,
                  }}
                >
                  Sin favoritos aún
                </Text>
                <Text
                  style={{
                    color: C.outline,
                    fontFamily: "PlusJakartaSans_400Regular",
                    fontSize: 15,
                    textAlign: "center",
                    maxWidth: 240,
                  }}
                >
                  Marca "Me sirve" en las reseñas que más te gusten para
                  guardarlas aquí.
                </Text>
              </View>
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
            <View style={{ paddingVertical: 48 }}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          ) : feedQ.isError ? (
            <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
              <Icon name="food-off-outline" size={48} color={C.outline} />
              <Text
                style={{
                  color: C.error,
                  fontFamily: "PlusJakartaSans_400Regular",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {String(
                  (feedQ.error as any)?.message ?? "Error al cargar el feed",
                )}
              </Text>
            </View>
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                favorited={favIds.has(item.restaurant.id)}
                onToggleFavorite={() =>
                  toggleFav.mutate({
                    restaurantId: item.restaurant.id,
                    favorited: favIds.has(item.restaurant.id),
                  })
                }
              />
            ))
          ) : (
            <View
              style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}
            >
              <Icon name="food-off-outline" size={48} color={C.outline} />
              <Text
                style={{
                  color: C.onSurfaceVariant,
                  fontFamily: "Outfit_700Bold",
                  fontSize: 16,
                }}
              >
                {feed.length === 0
                  ? "Todavía no hay ranks"
                  : "Nada en esta categoría"}
              </Text>
              <Text
                style={{
                  color: C.outline,
                  fontFamily: "PlusJakartaSans_400Regular",
                  fontSize: 14,
                  textAlign: "center",
                  maxWidth: 250,
                }}
              >
                {feed.length === 0
                  ? "Sé el primero: abre un lugar y deja tu rank."
                  : "Prueba otra categoría o quita el filtro."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
