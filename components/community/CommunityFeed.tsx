import { useAuthGate } from "@/components/AuthGate";
import { FeedRow } from "@/components/community/FeedRow";
import { FeedSkeleton } from "@/components/community/FeedSkeleton";
import { TopicFilters } from "@/components/community/TopicFilters";
import { usePostActions } from "@/components/community/usePostActions";
import { AppLogo } from "@/components/ui/AppLogo";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TourGuide, type TourStep } from "@/components/tour/TourGuide";
import { SearchBar } from "@/components/ui/SearchBar";
import type { TopicKey } from "@/lib/community/topics";
import { impact } from "@/lib/haptics";
import { useCategories } from "@/lib/queries/categories";
import { useCommunityFeed, type FeedItem } from "@/lib/queries/community";
import { capWidth, useIsTablet } from "@/lib/responsive";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * El feed de Comunidad: cabecera igual que Inicio (logo, buscar, campana),
 * filtros de tema y categoría, scroll infinito, tirar para refrescar y el
 * botón flotante para publicar.
 *
 * `asRestaurantId`: el dueño ve el mismo feed y publica como su local.
 * `header`: "home" (pestaña, con logo) o un nodo propio (pantalla apilada).
 */
export function CommunityFeed({
  restaurantId,
  asRestaurantId,
  canPost = true,
  header = "home",
  bottomInset = 96,
}: {
  /** Solo los posts que etiquetan este local (sin filtros de tema/categoría). */
  restaurantId?: string;
  asRestaurantId?: string | null;
  canPost?: boolean;
  header?: "home" | React.ReactNode;
  bottomInset?: number;
}) {
  const { C } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const [topic, setTopic] = useState<TopicKey | undefined>();
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [query, setQuery] = useState("");
  // La ruedita solo cuando la persona tira hacia abajo, no en recargas de fondo.
  const [pulling, setPulling] = useState(false);

  // Búsqueda con una pausa corta para no consultar en cada letra.
  useEffect(() => {
    const t = setTimeout(() => setQuery(queryText.trim()), 300);
    return () => clearTimeout(t);
  }, [queryText]);

  const filters = useMemo(
    () =>
      restaurantId
        ? { restaurantId, query: query || undefined }
        : { topic, categoryId, query: query || undefined },
    [restaurantId, topic, categoryId, query],
  );
  const feed = useCommunityFeed(filters);
  const items = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const { data: categories = [] } = useCategories();
  const categoryLabels = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);
  const actions = usePostActions();
  const { requireAuth } = useAuthGate();
  const filtered = !!topic || !!categoryId || !!query || !!restaurantId;

  const openComposer = () => {
    if (!requireAuth("post")) return;
    impact("light");
    router.push(
      asRestaurantId
        ? { pathname: "/community/new", params: { asRestaurant: asRestaurantId } }
        : { pathname: "/community/new" },
    );
  };

  // Tour de la pestaña (solo en la pestaña, no en el feed de un local).
  const tourTopicsRef = useRef<View>(null);
  const tourSearchRef = useRef<View>(null);
  const tourComposeRef = useRef<View>(null);
  const tourSteps: TourStep[] = [
    {
      ref: tourTopicsRef,
      icon: "comment-text-multiple",
      title: "Elige un tema",
      text: "Filtra por Recomiéndame, Recetas, Antojos y más, o por tipo de comida.",
    },
    {
      ref: tourSearchRef,
      icon: "magnify",
      title: "Busca en Comunidad",
      text: "Encuentra publicaciones por plato o por local.",
    },
    {
      ref: tourComposeRef,
      icon: "pencil-outline",
      title: "Publica",
      text: "Pide una recomendación o cuenta dónde comiste rico. Participar te da XP.",
    },
  ];

  const searchButton = (
    <Pressable
      ref={header === "home" ? tourSearchRef : undefined}
      onPress={() => {
        setSearchOpen((o) => !o);
        if (searchOpen) setQueryText("");
      }}
      accessibilityRole="button"
      accessibilityLabel={searchOpen ? "Cerrar búsqueda" : "Buscar en Comunidad"}
      hitSlop={6}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: C.outlineVariant,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={searchOpen ? "close" : "search"} size={20} color={C.onSurface} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {header === "home" ? (
        <ScreenHeader
          border={false}
          left={<AppLogo />}
          right={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {searchButton}
              <NotificationBell />
            </View>
          }
        />
      ) : (
        <View>
          {header}
          <View style={{ position: "absolute", right: 20, bottom: 10 }}>{searchButton}</View>
        </View>
      )}

      {searchOpen && (
        <Animated.View
          entering={FadeInUp.duration(200)}
          exiting={FadeOutUp.duration(150)}
          style={{ paddingHorizontal: 20, paddingBottom: 6 }}
        >
          <SearchBar
            value={queryText}
            onChangeText={setQueryText}
            onClear={() => setQueryText("")}
            placeholder="Buscar en Comunidad: platos, locales…"
            autoFocus
          />
        </Animated.View>
      )}

      <Animated.FlatList
        layout={LinearTransition.duration(200)}
        data={items}
        keyExtractor={(it) => `${it.kind}:${it.id}`}
        contentContainerStyle={{ paddingBottom: insets.bottom + bottomInset, ...capWidth(isTablet) }}
        ListHeaderComponent={
          restaurantId ? null : (
            <View ref={tourTopicsRef} collapsable={false}>
              <TopicFilters topic={topic} categoryId={categoryId} onTopic={setTopic} onCategory={setCategoryId} />
            </View>
          )
        }
        renderItem={({ item }: { item: FeedItem }) => (
          <FeedRow
            item={item}
            categoryLabels={categoryLabels}
            onOpen={actions.onOpen}
            onOpenRestaurant={actions.onOpenRestaurant}
            onToggleLike={actions.onToggleLike}
            onMenu={actions.onMenu}
          />
        )}
        onEndReachedThreshold={0.8}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={async () => {
              setPulling(true);
              try {
                await feed.refetch();
              } finally {
                setPulling(false);
              }
            }}
            tintColor={C.primary}
          />
        }
        ListEmptyComponent={
          feed.isLoading ? (
            <FeedSkeleton />
          ) : feed.isError ? (
            <EmptyState
              icon="wifi-off"
              title="No pudimos cargar Comunidad"
              body="Revisa tu conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => feed.refetch()}
            />
          ) : (
            <EmptyState
              icon="comment-text-multiple"
              title={filtered ? "Nada por aquí todavía" : "Comunidad está empezando"}
              body={
                filtered
                  ? "Sé el primero en publicar sobre esto."
                  : "Cuenta dónde comiste rico, pide una recomendación o comparte una receta."
              }
              actionLabel={canPost ? "Publicar" : undefined}
              onAction={canPost ? openComposer : undefined}
            />
          )
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <AppText variant="caption" color={C.onSurfaceVariant} style={{ textAlign: "center", padding: 16 }}>
              Cargando más…
            </AppText>
          ) : null
        }
      />

      {canPost && (
        <Pressable
          ref={tourComposeRef}
          onPress={openComposer}
          accessibilityRole="button"
          accessibilityLabel="Publicar en Comunidad"
          style={{
            position: "absolute",
            right: 20,
            bottom: insets.bottom + bottomInset - 8,
            width: 60,
            height: 60,
            borderRadius: 20,
            backgroundColor: C.primary,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: C.border,
          }}
        >
          <Icon name="pencil-outline" size={26} color="#fff" />
        </Pressable>
      )}

      {actions.reportSheet}

      {header === "home" && !restaurantId && canPost && (
        <TourGuide tourKey="community" ready={!feed.isLoading} steps={tourSteps} />
      )}
    </View>
  );
}
