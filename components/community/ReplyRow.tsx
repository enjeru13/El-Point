import { AppText } from "@/components/ui/AppText";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { shortAgo } from "@/lib/community/time";
import type { Reply } from "@/lib/queries/community";
import { useTheme } from "@/lib/ThemeContext";
import { Pressable, View } from "react-native";

/**
 * Una respuesta en el hilo, como en Threads: la línea vertical une el avatar
 * con lo que cuelga debajo. Las respuestas a otra respuesta van un nivel más
 * a la derecha (depth 1) y, si contestan a alguien que no es la raíz, dicen
 * "Respondiendo a @x".
 */
export function ReplyRow({
  reply,
  last,
  depth = 0,
  replyingTo,
  isAuthor,
  onOpenRestaurant,
  onMenu,
  onReply,
  onToggleLike,
  onOpenAuthor,
  renderBody,
}: {
  reply: Reply;
  last: boolean;
  depth?: 0 | 1;
  /** Nombre de usuario al que contesta, si no es la raíz del hilo. */
  replyingTo?: string | null;
  /** Quien escribió el post. */
  isAuthor?: boolean;
  onOpenRestaurant: (id: string) => void;
  onMenu?: (reply: Reply) => void;
  onReply?: (reply: Reply) => void;
  onToggleLike?: (reply: Reply) => void;
  onOpenAuthor?: (reply: Reply) => void;
  renderBody?: (body: string) => React.ReactNode;
}) {
  const { C } = useTheme();
  const asLocal = !!reply.asRestaurantId;
  const name = asLocal
    ? (reply.asRestaurantName ?? "Local")
    : reply.authorUsername
      ? `@${reply.authorUsername}`
      : (reply.authorName ?? "Alguien");

  if (reply.removed) {
    return (
      <View style={{ flexDirection: "row", gap: 12, paddingLeft: depth ? 68 : 20, paddingRight: 20 }}>
        <View style={{ alignItems: "center", width: depth ? 28 : 36 }}>
          <View style={{ width: depth ? 28 : 36, height: depth ? 28 : 36, borderRadius: 18, backgroundColor: C.surfaceContainer }} />
          {!last && <View style={{ flex: 1, width: 2, borderRadius: 1, backgroundColor: C.outlineVariant, marginTop: 6 }} />}
        </View>
        <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ flex: 1, paddingTop: 6, paddingBottom: 18, fontStyle: "italic" }}>
          Respuesta eliminada
        </AppText>
      </View>
    );
  }

  const avatarSize = depth ? 28 : 36;
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingLeft: depth ? 68 : 20, paddingRight: 20, opacity: reply.pending ? 0.6 : 1 }}>
      <Pressable
        onPress={() => onOpenAuthor?.(reply)}
        disabled={!onOpenAuthor || asLocal}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${name}`}
        style={{ alignItems: "center", width: avatarSize }}
      >
        <Avatar
          uri={asLocal ? reply.asRestaurantLogo : reply.authorAvatar}
          size={avatarSize}
          icon={asLocal ? "storefront-outline" : "account"}
          bordered={false}
        />
        {!last && <View style={{ flex: 1, width: 2, borderRadius: 1, backgroundColor: C.outlineVariant, marginTop: 6 }} />}
      </Pressable>

      <View style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </AppText>
          {(asLocal || isAuthor) && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: C.primaryFixed }}>
              <AppText variant="caption" color={C.primary}>
                {asLocal ? "Local" : "Autor"}
              </AppText>
            </View>
          )}
          <AppText variant="caption" color={C.onSurfaceVariant}>
            · {reply.pending ? "enviando…" : shortAgo(reply.createdAt)}
          </AppText>
          <View style={{ flex: 1 }} />
          {onMenu && !reply.pending && (
            <Pressable
              onPress={() => onMenu(reply)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Más opciones de la respuesta"
              style={{ minWidth: 32, alignItems: "flex-end" }}
            >
              <Icon name="dots-horizontal" size={18} color={C.onSurfaceVariant} />
            </Pressable>
          )}
        </View>

        {!!replyingTo && (
          <AppText variant="caption" color={C.onSurfaceVariant} style={{ marginTop: 2 }}>
            Respondiendo a <AppText variant="caption" color={C.primary}>@{replyingTo}</AppText>
          </AppText>
        )}
        <AppText variant="body" style={{ marginTop: 3 }}>
          {renderBody ? renderBody(reply.body) : reply.body}
        </AppText>

        {reply.restaurantId && reply.restaurantName && (
          <Pressable
            onPress={() => onOpenRestaurant(reply.restaurantId!)}
            accessibilityRole="link"
            accessibilityLabel={`Ver ${reply.restaurantName}`}
            hitSlop={6}
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              paddingLeft: 6,
              paddingRight: 12,
              paddingVertical: 5,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: C.outlineVariant,
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
            <AppText variant="label" numberOfLines={1}>
              {reply.restaurantName}
            </AppText>
          </Pressable>
        )}

        {!reply.pending && (onToggleLike || onReply) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 8 }}>
            {onToggleLike && (
              <Pressable
                onPress={() => onToggleLike(reply)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ selected: reply.likedByMe }}
                accessibilityLabel={reply.likedByMe ? "Quitar me gusta" : "Me gusta"}
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <Icon
                  name="heart"
                  size={18}
                  color={reply.likedByMe ? C.primary : C.onSurfaceVariant}
                  fill={reply.likedByMe ? C.primary : "transparent"}
                />
                {reply.likeCount > 0 && (
                  <AppText variant="caption" color={reply.likedByMe ? C.primary : C.onSurfaceVariant}>
                    {reply.likeCount}
                  </AppText>
                )}
              </Pressable>
            )}
            {onReply && (
              <Pressable
                onPress={() => onReply(reply)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Responder a ${name}`}
              >
                <Icon name="message-circle" size={18} color={C.onSurfaceVariant} />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
