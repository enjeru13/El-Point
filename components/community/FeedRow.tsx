import { PhotoCarousel } from "@/components/community/PhotoCarousel";
import { AppText } from "@/components/ui/AppText";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { shortAgo } from "@/lib/community/time";
import { topicLabel } from "@/lib/community/topics";
import { impact } from "@/lib/haptics";
import type { FeedItem } from "@/lib/queries/community";
import { postPhotoUrl, reviewPhotoUrl } from "@/lib/storage";
import { useTheme } from "@/lib/ThemeContext";
import { memo, useMemo } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

/**
 * Una fila del feed, sin tarjeta: avatar a la izquierda, nombre y hora en una
 * línea, texto, etiquetas, fotos y una fila discreta de acciones. El naranja
 * de marca solo aparece en el me gusta activo y en la etiqueta del local.
 */
export const FeedRow = memo(function FeedRow({
  item,
  categoryLabels,
  onOpen,
  onOpenRestaurant,
  onToggleLike,
  onMenu,
  detail = false,
}: {
  item: FeedItem;
  categoryLabels: Map<number, string>;
  onOpen?: (item: FeedItem) => void;
  onOpenRestaurant: (restaurantId: string) => void;
  onToggleLike: (item: FeedItem) => void;
  onMenu?: (item: FeedItem) => void;
  /** En el detalle el texto no se recorta y la fila no se toca para abrir. */
  detail?: boolean;
}) {
  const { C } = useTheme();
  const pending = item.id.startsWith("pending-");
  const asLocal = !!item.asRestaurantId;
  const name = asLocal ? item.asRestaurantName : item.authorName;
  const avatar = asLocal ? item.asRestaurantLogo : item.authorAvatar;

  const photos = useMemo(
    () => item.photoPaths.map((p) => (item.kind === "review" ? reviewPhotoUrl(p) : postPhotoUrl(p))),
    [item.photoPaths, item.kind],
  );
  const tags = item.categoryIds.map((id) => categoryLabels.get(id)).filter(Boolean) as string[];

  return (
    <Pressable
      onPress={detail || pending ? undefined : () => onOpen?.(item)}
      accessibilityRole={detail ? undefined : "button"}
      accessibilityHint={detail ? undefined : "Abre el post"}
      style={{
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: detail ? 0 : 1,
        borderBottomColor: C.outlineVariant,
        opacity: pending ? 0.6 : 1,
      }}
    >
      <Avatar uri={avatar} size={40} icon={asLocal ? "storefront-outline" : "account"} bordered={false} />

      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Nombre · hora …… menú */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name ?? "Alguien"}
          </AppText>
          {asLocal && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: C.primaryFixed }}>
              <AppText variant="caption" color={C.primary}>
                Local
              </AppText>
            </View>
          )}
          <AppText variant="caption" color={C.onSurfaceVariant}>
            · {pending ? "publicando…" : shortAgo(item.createdAt)}
          </AppText>
          <View style={{ flex: 1 }} />
          {onMenu && !pending && (
            <Pressable
              onPress={() => onMenu(item)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Más opciones"
              style={{ minWidth: 32, alignItems: "flex-end" }}
            >
              <Icon name="dots-horizontal" size={20} color={C.onSurfaceVariant} />
            </Pressable>
          )}
        </View>

        {/* Tema (y estrellas en reseñas) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
          <AppText variant="caption" color={C.onSurfaceVariant}>
            {item.kind === "review" ? "Reseña" : topicLabel(item.topic)}
          </AppText>
          {item.rating != null && (
            <AppText
              variant="caption"
              color={C.secondary}
              accessibilityLabel={`${item.rating} de 5 estrellas`}
            >
              · {"★".repeat(item.rating)}
              <AppText variant="caption" color={C.outlineVariant}>
                {"★".repeat(5 - item.rating)}
              </AppText>
            </AppText>
          )}
        </View>

        <AppText variant="body" style={{ marginTop: 6 }} numberOfLines={detail ? undefined : 8}>
          {item.body}
        </AppText>

        {tags.length > 0 && (
          <AppText variant="caption" color={C.onSurfaceVariant} style={{ marginTop: 6 }}>
            {tags.map((t) => `#${t.toLowerCase()}`).join("  ")}
          </AppText>
        )}

        <PhotoCarousel urls={photos} />

        <PlacePill item={item} onOpenRestaurant={onOpenRestaurant} />

        <Actions item={item} pending={pending} onToggleLike={onToggleLike} onOpen={detail ? undefined : onOpen} />
      </View>
    </Pressable>
  );
});

/** Píldora del local: tocable si está en la app; si es uno sugerido, solo texto. */
function PlacePill({ item, onOpenRestaurant }: { item: FeedItem; onOpenRestaurant: (id: string) => void }) {
  const { C } = useTheme();
  if (item.restaurantId && item.restaurantName && !item.asRestaurantId) {
    return (
      <Pressable
        onPress={() => onOpenRestaurant(item.restaurantId!)}
        accessibilityRole="link"
        accessibilityLabel={`Ver ${item.restaurantName}`}
        hitSlop={6}
        style={{
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: 10,
          paddingLeft: 6,
          paddingRight: 12,
          paddingVertical: 5,
          borderRadius: 99,
          borderWidth: 1,
          borderColor: C.outlineVariant,
          maxWidth: "100%",
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: C.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="storefront" size={13} color="#fff" />
        </View>
        <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
          {item.restaurantName}
        </AppText>
        {(item.restaurantCategory || item.restaurantZone) && (
          <AppText variant="caption" color={C.onSurfaceVariant} numberOfLines={1} style={{ flexShrink: 2 }}>
            · {item.restaurantCategory ?? item.restaurantZone}
          </AppText>
        )}
      </Pressable>
    );
  }
  if (item.suggestedName) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
        <Icon name="map-marker-outline" size={16} color={C.onSurfaceVariant} />
        <AppText variant="caption" color={C.onSurfaceVariant} numberOfLines={1} style={{ flexShrink: 1 }}>
          {item.suggestedName}
          {item.suggestedZone ? ` · ${item.suggestedZone}` : ""} · aún no está en El Point
        </AppText>
      </View>
    );
  }
  return null;
}

function Actions({
  item,
  pending,
  onToggleLike,
  onOpen,
}: {
  item: FeedItem;
  pending: boolean;
  onToggleLike: (item: FeedItem) => void;
  onOpen?: (item: FeedItem) => void;
}) {
  const { C } = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const likeColor = item.viewerLiked ? C.primary : C.onSurfaceVariant;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 10, marginLeft: -8 }}>
      <Pressable
        disabled={pending}
        onPress={() => {
          impact("light");
          if (!reduceMotion && !item.viewerLiked) {
            scale.value = withSequence(withSpring(1.25, { damping: 8, stiffness: 400 }), withSpring(1));
          }
          onToggleLike(item);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: item.viewerLiked }}
        accessibilityLabel={`${item.kind === "review" ? "Útil" : "Me gusta"}, ${item.likeCount}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 5, minHeight: 44, paddingHorizontal: 8 }}
      >
        <Animated.View style={heartStyle}>
          <Icon name="heart" size={21} color={likeColor} fill={item.viewerLiked ? C.primary : "none"} />
        </Animated.View>
        {item.likeCount > 0 && (
          <AppText variant="caption" color={likeColor}>
            {item.likeCount}
          </AppText>
        )}
      </Pressable>

      {item.kind === "post" && (
        <Pressable
          disabled={pending || !onOpen}
          onPress={() => onOpen?.(item)}
          accessibilityRole="button"
          accessibilityLabel={`Responder, ${item.replyCount} respuestas`}
          style={{ flexDirection: "row", alignItems: "center", gap: 5, minHeight: 44, paddingHorizontal: 8 }}
        >
          <Icon name="comment-text" size={20} color={C.onSurfaceVariant} />
          {item.replyCount > 0 && (
            <AppText variant="caption" color={C.onSurfaceVariant}>
              {item.replyCount}
            </AppText>
          )}
        </Pressable>
      )}
    </View>
  );
}
