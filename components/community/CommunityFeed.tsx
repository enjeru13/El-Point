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
import { SearchBar } from "@/components/ui/SearchBar";
import type { TopicKey } from "@/lib/community/topics";
import { impact } from "@/lib/haptics";
import { useCategories } from "@/lib/queries/categories";
import { useCommunityFeed, type FeedItem } from "@/lib/queries/community";
import { capWidth, useIsTablet } from "@/lib/responsive";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
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
  asRestaurantId,
  canPost = true,
  header = "home",
  bottomInset = 96,
}: {
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

  // Búsqueda con una pausa corta para no consultar en cada letra.
  useEffect(() => {
    const t = setTimeout(() => setQuery(queryText.trim()), 300);
    return () => clearTimeout(t);
  }, [queryText]);

  const filters = useMemo(() => ({ topic, categoryId, query: query || undefined }), [topic, categoryId, query]);
  const feed = useCommunityFeed(filters);
  const items = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const { data: categories = [] } = useCategories();
  const categoryLabels = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);
  const actions = usePostActions();
  const filtered = !!topic || !!categoryId || !!query;

  const openComposer = () => {
    impact("light");
    router.push(
      asRestaurantId
        ? { pathname: "/community/new", params: { asRestaurant: asRestaurantId } }
        : { pathname: "/community/new" },
    );
  };

  const searchButton = (
    <Pressable
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
        <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
          <SearchBar
            value={queryText}
            onChangeText={setQueryText}
            onClear={() => setQueryText("")}
            placeholder="Buscar en Comunidad: platos, locales…"
          />
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(it) => `${it.kind}:${it.id}`}
        contentContainerStyle={{ paddingBottom: insets.bottom + bottomInset, ...capWidth(isTablet) }}
        ListHeaderComponent={
          <View style={{ borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
            <TopicFilters topic={topic} categoryId={categoryId} onTopic={setTopic} onCategory={setCategoryId} />
          </View>
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
            refreshing={feed.isRefetching && !feed.isFetchingNextPage}
            onRefresh={() => feed.refetch()}
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
    </View>
  );
}
