import { CommunityFeed } from "@/components/community/CommunityFeed";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useAppSettings } from "@/lib/queries/community";
import { useMyProfile } from "@/lib/queries/me";
import { useMyRestaurant } from "@/lib/queries/owner";
import { hasPlan } from "@/lib/plan";
import { useTheme } from "@/lib/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Comunidad como pantalla apilada:
 *   - sin parámetros: el feed completo (lo abre el dueño desde su Resumen),
 *   - ?restaurant=<id>&title=…: solo los posts de ese local ("Ver todo" en
 *     el perfil, o "Te mencionan" del dueño).
 * Si quien mira es dueño, publica como su local.
 */
export default function CommunityStackScreen() {
  const { C } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurant, title } = useLocalSearchParams<{ restaurant?: string; title?: string }>();
  const { data: me } = useMyProfile();
  const { data: myRestaurant } = useMyRestaurant();
  const { data: settings } = useAppSettings();

  const isOwner = me?.role === "restaurant_owner" && !!myRestaurant;
  const ownerCanPost =
    isOwner &&
    !!settings?.ownerPostsEnabled &&
    hasPlan(myRestaurant!) &&
    !myRestaurant!.community_banned_at;
  const canPost = isOwner ? ownerCanPost : !restaurant;

  const header = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingTop: insets.top + 6,
        paddingBottom: 10,
        paddingHorizontal: 12,
        paddingRight: 72,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name="arrow-left" size={24} color={C.onSurface} />
      </Pressable>
      <AppText variant="subtitle" numberOfLines={1} style={{ flexShrink: 1 }}>
        {title ?? "Comunidad"}
      </AppText>
    </View>
  );

  return (
    <CommunityFeed
      header={header}
      restaurantId={restaurant}
      asRestaurantId={isOwner ? myRestaurant!.id : null}
      canPost={canPost}
      bottomInset={24}
    />
  );
}
