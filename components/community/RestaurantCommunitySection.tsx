import { FeedRow } from "@/components/community/FeedRow";
import { usePostActions } from "@/components/community/usePostActions";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useCategories } from "@/lib/queries/categories";
import { useCommunityFeed } from "@/lib/queries/community";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, View } from "react-native";

const PREVIEW = 3;

/**
 * "Lo que dicen en Comunidad" en el perfil de un local: los posts que lo
 * etiquetan (también los que lo nombraron antes de que estuviera en la app).
 * Sale en todos los locales, tengan plan o no: es contenido de la gente.
 */
export function RestaurantCommunitySection({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) {
  const { C } = useTheme();
  const router = useRouter();
  const feed = useCommunityFeed({ restaurantId });
  const items = feed.data?.pages[0]?.slice(0, PREVIEW) ?? [];
  const { data: categories = [] } = useCategories();
  const categoryLabels = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);
  const actions = usePostActions();

  if (feed.isLoading || items.length === 0) return null;

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="comment-text-multiple" size={20} color={C.primary} />
          <AppText variant="heading" style={{ fontSize: 20, lineHeight: 25 }}>
            Lo que dicen en Comunidad
          </AppText>
        </View>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/community/feed",
              params: { restaurant: restaurantId, title: restaurantName },
            })
          }
          hitSlop={8}
          accessibilityRole="button"
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <AppText variant="label" color={C.primary}>
            Ver todo
          </AppText>
        </Pressable>
      </View>
      <View style={{ marginHorizontal: -20 }}>
        {items.map((item) => (
          <FeedRow
            key={item.id}
            item={item}
            categoryLabels={categoryLabels}
            onOpen={actions.onOpen}
            onOpenRestaurant={() => {}}
            onToggleLike={actions.onToggleLike}
            onMenu={actions.onMenu}
          />
        ))}
      </View>
      {actions.reportSheet}
    </View>
  );
}
