import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useAdminCounts } from "@/lib/queries/admin";
import { useMyProfile } from "@/lib/queries/me";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Row({
  icon,
  label,
  sub,
  count,
  onPress,
}: {
  icon: string;
  label: string;
  sub: string;
  count: number;
  onPress: () => void;
}) {
  const { C, shadow } = useTheme();
  const hot = count > 0;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderRadius: 20,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        ...shadow.sm,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: hot ? C.error + "22" : C.primaryFixed,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Icon name={icon} size={22} color={hot ? C.error : C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="caption" color={C.outline}>
          {sub}
        </AppText>
      </View>
      {hot ? (
        <View
          style={{
            minWidth: 26,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 99,
            backgroundColor: C.error + "22",
            borderWidth: 1,
            borderColor: C.border,
            alignItems: "center",
          }}
        >
          <AppText variant="label" color={C.error}>
            {count}
          </AppText>
        </View>
      ) : (
        <Icon name="chevron-right" size={20} color={C.outline} />
      )}
    </Pressable>
  );
}

export default function AdminHubScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const profileQ = useMyProfile();
  const isAdmin = !!profileQ.data?.is_admin;
  const countsQ = useAdminCounts(isAdmin);
  const c = countsQ.data ?? { reviews: 0, restaurants: 0, reported: 0 };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: C.surface,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
            ...shadow.sm,
          }}
        >
          <Icon name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1 }}>
          Panel de moderación
        </AppText>
      </View>

      {!isAdmin ? (
        <EmptyState
          icon="shield-outline"
          title="Sin acceso"
          body="Esta sección es solo para moderadores."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            gap: 12,
            paddingBottom: insets.bottom + 40,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={countsQ.isRefetching}
              onRefresh={() => countsQ.refetch()}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
        >
          {countsQ.isLoading ? (
            <SkeletonList count={3} kind="row" />
          ) : (
            <>
              <Row
                icon="storefront-outline"
                label="Locales por aprobar"
                sub="Verificación de restaurantes nuevos"
                count={c.restaurants}
                onPress={() => router.push("/admin/restaurants")}
              />
              <Row
                icon="comment-text-multiple"
                label="Reseñas reportadas"
                sub="Pendientes de revisión"
                count={c.reviews}
                onPress={() => router.push("/admin/reviews")}
              />
              <Row
                icon="flag"
                label="Locales reportados"
                sub="Suspendidos por reportes de la comunidad"
                count={c.reported}
                onPress={() => router.push("/admin/restaurant-reports")}
              />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
