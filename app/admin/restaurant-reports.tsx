import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui/Skeleton";
import {
  useReportedRestaurants,
  useResolveRestaurantReport,
  type ReportedRestaurant,
} from "@/lib/queries/admin";
import { useMyProfile } from "@/lib/queries/me";
import { RESTAURANT_REPORT_REASONS } from "@/lib/queries/restaurants";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useRouter } from "expo-router";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const REASON_LABEL: Record<string, string> = Object.fromEntries(
  RESTAURANT_REPORT_REASONS.map((r) => [r.key, r.label]),
);

function Card({
  item,
  busy,
  onRestore,
  onRemove,
}: {
  item: ReportedRestaurant;
  busy: boolean;
  onRestore: () => void;
  onRemove: () => void;
}) {
  const { C, shadow } = useTheme();
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 20,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: C.border,
        ...shadow.sm,
      }}
    >
      <View>
        <AppText variant="heading" style={{ fontSize: 17 }}>
          {item.name}
        </AppText>
        <AppText variant="caption" color={C.outline}>
          {item.owner_name}
          {item.address ? ` · ${item.address}` : ""}
        </AppText>
      </View>

      <View
        style={{
          gap: 6,
          padding: 10,
          borderRadius: 12,
          backgroundColor: C.error + "22",
        }}
      >
        <AppText variant="overline" color={C.error}>
          {item.reports.length}{" "}
          {item.reports.length === 1 ? "REPORTE" : "REPORTES"}
        </AppText>
        {item.reports.map((rep, i) => (
          <AppText key={i} variant="caption" color={C.onSurfaceVariant}>
            • {REASON_LABEL[rep.reason] ?? rep.reason}
            {rep.note ? ` — “${rep.note}”` : ""}
          </AppText>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button
          label="Restaurar"
          onPress={onRestore}
          disabled={busy}
          variant="secondary"
          icon="check"
          size="sm"
          fullWidth={false}
          style={{ flex: 1 }}
        />
        <Button
          label="Retirar"
          onPress={onRemove}
          disabled={busy}
          variant="danger"
          icon="delete-outline"
          size="sm"
          fullWidth={false}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

export default function AdminRestaurantReportsScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const profileQ = useMyProfile();
  const isAdmin = !!profileQ.data?.is_admin;
  const listQ = useReportedRestaurants(isAdmin);
  const resolve = useResolveRestaurantReport();

  function restore(id: string) {
    resolve.mutate(
      { restaurantId: id, action: "restore" },
      {
        onSuccess: () => toast.success("Local restaurado"),
        onError: () => toast.error("No se pudo aplicar"),
      },
    );
  }

  function remove(id: string) {
    Alert.alert(
      "Retirar local",
      "Quedará fuera de El Point de forma permanente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Retirar",
          style: "destructive",
          onPress: () =>
            resolve.mutate(
              { restaurantId: id, action: "remove" },
              {
                onSuccess: () => toast.success("Local retirado"),
                onError: () => toast.error("No se pudo aplicar"),
              },
            ),
        },
      ],
    );
  }

  const list = listQ.data ?? [];

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
          backgroundColor: C.background,
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
          Locales reportados
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
            gap: 14,
            paddingBottom: insets.bottom + 40,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={listQ.isRefetching}
              onRefresh={() => listQ.refetch()}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
        >
          {listQ.isLoading ? (
            <SkeletonList count={2} kind="card" />
          ) : list.length === 0 ? (
            <EmptyState
              icon="check-circle"
              title="Nada pendiente"
              body="Ningún local suspendido por reportes."
            />
          ) : (
            list.map((item) => (
              <Card
                key={item.id}
                item={item}
                busy={resolve.isPending}
                onRestore={() => restore(item.id)}
                onRemove={() => remove(item.id)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
