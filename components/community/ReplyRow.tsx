import { AppText } from "@/components/ui/AppText";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { shortAgo } from "@/lib/community/time";
import type { Reply } from "@/lib/queries/community";
import { useTheme } from "@/lib/ThemeContext";
import { Pressable, View } from "react-native";

/**
 * Una respuesta en el hilo: una línea vertical une el avatar con la
 * siguiente respuesta, como en Threads.
 */
export function ReplyRow({
  reply,
  last,
  onOpenRestaurant,
  onMenu,
}: {
  reply: Reply;
  last: boolean;
  onOpenRestaurant: (id: string) => void;
  onMenu?: (reply: Reply) => void;
}) {
  const { C } = useTheme();
  const asLocal = !!reply.asRestaurantId;
  const name = asLocal ? (reply.asRestaurantName ?? "Local") : (reply.authorName ?? "Alguien");

  return (
    <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, opacity: reply.pending ? 0.6 : 1 }}>
      <View style={{ alignItems: "center", width: 36 }}>
        <Avatar
          uri={asLocal ? reply.asRestaurantLogo : reply.authorAvatar}
          size={36}
          icon={asLocal ? "storefront-outline" : "account"}
          bordered={false}
        />
        {!last && <View style={{ flex: 1, width: 2, borderRadius: 1, backgroundColor: C.outlineVariant, marginTop: 6 }} />}
      </View>

      <View style={{ flex: 1, minWidth: 0, paddingBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </AppText>
          {asLocal && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: C.primaryFixed }}>
              <AppText variant="caption" color={C.primary}>
                Local
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

        <AppText variant="body" style={{ marginTop: 3 }}>
          {reply.body}
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
      </View>
    </View>
  );
}
