import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui/Skeleton";
import { StarRow } from "@/components/ui/StarRow";
import {
  useModerationQueue,
  useResolveReview,
  type ModerationItem,
} from "@/lib/queries/moderation";
import { useMyProfile } from "@/lib/queries/me";
import { REPORT_REASONS } from "@/lib/queries/reviews";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useRouter } from "expo-router";
import { Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const REASON_LABEL: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.key, r.label]),
);

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return `hace ${Math.floor(d / 7)} sem`;
}

function QueueCard({
  item,
  onApprove,
  onRemove,
  busy,
}: {
  item: ModerationItem;
  onApprove: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const { C, shadow } = useTheme();
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 20,
        padding: 16,
        gap: 12,
        borderWidth: 2,
        borderColor: C.border,
        ...shadow.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="storefront-outline" size={16} color={C.primary} />
        <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
          {item.restaurant_name}
        </AppText>
        <StarRow rating={item.rating} size={12} />
      </View>

      <AppText variant="caption" color={C.outline}>
        {item.author_name} · {timeAgo(item.created_at)}
      </AppText>

      <AppText variant="body" color={C.onSurface}>
        {item.body}
      </AppText>

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
          label="Aprobar"
          onPress={onApprove}
          disabled={busy}
          variant="secondary"
          icon="check"
          size="sm"
          fullWidth={false}
          style={{ flex: 1 }}
        />
        <Button
          label="Eliminar"
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

export default function AdminReviewsScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const profileQ = useMyProfile();
  const isAdmin = !!profileQ.data?.is_admin;
  const queueQ = useModerationQueue(isAdmin);
  const resolve = useResolveReview();

  function approve(id: string) {
    resolve.mutate(
      { reviewId: id, action: "approve" },
      {
        onSuccess: () => toast.success("Reseña restaurada"),
        onError: () => toast.error("No se pudo aplicar"),
      },
    );
  }

  function remove(id: string) {
    Alert.alert(
      "Eliminar reseña",
      "Quedará retirada de forma permanente y suma una falta al autor.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () =>
            resolve.mutate(
              { reviewId: id, action: "remove" },
              {
                onSuccess: () => toast.success("Reseña eliminada"),
                onError: () => toast.error("No se pudo aplicar"),
              },
            ),
        },
      ],
    );
  }

  const queue = queueQ.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 2,
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
            borderWidth: 2,
            borderColor: C.border,
            backgroundColor: C.surface,
            ...shadow.sm,
          }}
        >
          <Icon name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1 }}>
          Moderación
        </AppText>
        {queue.length > 0 && (
          <View
            style={{
              paddingHorizontal: 9,
              paddingVertical: 2,
              borderRadius: 99,
              backgroundColor: C.error + "22",
              borderWidth: 2,
              borderColor: C.border,
            }}
          >
            <AppText variant="label" color={C.error}>
              {queue.length}
            </AppText>
          </View>
        )}
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
              refreshing={queueQ.isRefetching}
              onRefresh={() => queueQ.refetch()}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
        >
          {queueQ.isLoading ? (
            <SkeletonList count={3} kind="card" />
          ) : queue.length === 0 ? (
            <EmptyState
              icon="check-circle"
              title="Nada pendiente"
              body="No hay reseñas reportadas esperando revisión."
            />
          ) : (
            queue.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                busy={resolve.isPending}
                onApprove={() => approve(item.id)}
                onRemove={() => remove(item.id)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
