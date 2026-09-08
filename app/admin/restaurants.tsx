import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui/Skeleton";
import {
  useRestaurantQueue,
  useReviewRestaurant,
  type PendingRestaurant,
} from "@/lib/queries/admin";
import { useMyProfile } from "@/lib/queries/me";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function timeAgo(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600_000);
  if (h < 1) return "hace un momento";
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} días`;
}

function MetaRow({ icon, text }: { icon: string; text: string }) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon name={icon} size={14} color={C.outline} />
      <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

function QueueCard({
  item,
  busy,
  onApprove,
  onReject,
}: {
  item: PendingRestaurant;
  busy: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const { C, shadow } = useTheme();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

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
          {item.owner_name} · {timeAgo(item.submitted_at)}
        </AppText>
      </View>

      {item.photo_url ? (
        <Pressable onPress={() => Linking.openURL(item.photo_url!)}>
          <Image
            source={{ uri: item.photo_url }}
            style={{
              width: "100%",
              height: 170,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.border,
            }}
            contentFit="cover"
            transition={150}
          />
        </Pressable>
      ) : (
        <View
          style={{
            height: 90,
            borderRadius: 14,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: C.outlineVariant,
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <Icon name="camera-plus-outline" size={20} color={C.outline} />
          <AppText variant="caption" color={C.outline}>
            Sin foto de fachada
          </AppText>
        </View>
      )}

      <View style={{ gap: 6 }}>
        {item.address && <MetaRow icon="map-marker-outline" text={item.address} />}
        {item.categories.length > 0 && (
          <MetaRow icon="silverware-fork-knife" text={item.categories.join(" · ")} />
        )}
        {item.rif && <MetaRow icon="shield-outline" text={`RIF ${item.rif}`} />}
        {item.whatsapp && <MetaRow icon="whatsapp" text={item.whatsapp} />}
        {item.instagram && <MetaRow icon="instagram" text={`@${item.instagram}`} />}
      </View>

      {rejecting ? (
        <View style={{ gap: 8 }}>
          <Field
            value={reason}
            onChangeText={(t) => setReason(t.slice(0, 200))}
            placeholder="Motivo del rechazo (lo verá el dueño)…"
            multiline
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              label="Cancelar"
              onPress={() => {
                setRejecting(false);
                setReason("");
              }}
              variant="secondary"
              size="sm"
              fullWidth={false}
              style={{ flex: 1 }}
            />
            <Button
              label="Rechazar"
              onPress={() => onReject(reason.trim())}
              disabled={busy || reason.trim().length < 3}
              variant="danger"
              size="sm"
              fullWidth={false}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            label="Rechazar"
            onPress={() => setRejecting(true)}
            disabled={busy}
            variant="secondary"
            size="sm"
            fullWidth={false}
            style={{ flex: 1 }}
          />
          <Button
            label="Aprobar"
            onPress={onApprove}
            disabled={busy}
            icon="check"
            size="sm"
            fullWidth={false}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </View>
  );
}

export default function AdminRestaurantsScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const profileQ = useMyProfile();
  const isAdmin = !!profileQ.data?.is_admin;
  const queueQ = useRestaurantQueue(isAdmin);
  const review = useReviewRestaurant();

  function approve(id: string) {
    review.mutate(
      { restaurantId: id, action: "approve" },
      {
        onSuccess: () => toast.success("Local aprobado"),
        onError: () => toast.error("No se pudo aplicar"),
      },
    );
  }

  function reject(id: string, reason: string) {
    review.mutate(
      { restaurantId: id, action: "reject", reason },
      {
        onSuccess: () => toast.success("Local rechazado"),
        onError: () => toast.error("No se pudo aplicar"),
      },
    );
  }

  const queue = queueQ.data ?? [];

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
          Locales por aprobar
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
              body="No hay locales esperando verificación."
            />
          ) : (
            queue.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                busy={review.isPending}
                onApprove={() => approve(item.id)}
                onReject={(reason) => reject(item.id, reason)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
