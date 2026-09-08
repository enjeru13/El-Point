import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useMyProfile } from "@/lib/queries/me";
import {
  useResolveSupportMessage,
  useSupportMessages,
  type SupportMessage,
} from "@/lib/queries/support";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui/Skeleton";

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return `hace ${Math.floor(d / 7)} sem`;
}

function MsgCard({
  m,
  onResolve,
  busy,
}: {
  m: SupportMessage;
  onResolve: (status: "open" | "closed") => void;
  busy: boolean;
}) {
  const { C, shadow } = useTheme();
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 20,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: C.border,
        ...shadow.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="account" size={15} color={C.primary} />
        <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
          {m.author_name}
        </AppText>
        <AppText variant="caption" color={C.outline}>
          {timeAgo(m.created_at)}
        </AppText>
      </View>

      <AppText variant="heading" style={{ fontSize: 16, lineHeight: 21 }}>
        {m.subject}
      </AppText>
      <AppText variant="body" color={C.onSurfaceVariant} style={{ lineHeight: 21 }}>
        {m.body}
      </AppText>

      {m.email && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="email-outline" size={13} color={C.outline} />
          <AppText variant="caption" color={C.onSurfaceVariant}>
            {m.email}
          </AppText>
        </View>
      )}

      {m.status === "open" ? (
        <Button
          label="Marcar como resuelto"
          onPress={() => onResolve("closed")}
          disabled={busy}
          variant="secondary"
          icon="check"
          size="sm"
          fullWidth={false}
        />
      ) : (
        <Pressable
          onPress={() => onResolve("open")}
          disabled={busy}
          style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5 }}
        >
          <Icon name="reply" size={14} color={C.outline} />
          <AppText variant="label" color={C.outline}>
            Reabrir
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

export default function AdminSupportScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const isAdmin = !!useMyProfile().data?.is_admin;
  const [tab, setTab] = useState<"open" | "closed">("open");
  const q = useSupportMessages(isAdmin, tab);
  const resolve = useResolveSupportMessage();

  const msgs = q.data ?? [];

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
          Soporte
        </AppText>
      </View>

      {!isAdmin ? (
        <EmptyState icon="shield-outline" title="Sin acceso" body="Solo para moderadores." />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 20, paddingHorizontal: 20, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
            {(["open", "closed"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={{
                  paddingBottom: 10,
                  borderBottomWidth: 3,
                  borderBottomColor: tab === t ? C.primary : "transparent",
                  marginBottom: -1,
                }}
              >
                <AppText variant="heading" color={tab === t ? C.primary : C.outline}>
                  {t === "open" ? "Abiertos" : "Resueltos"}
                </AppText>
              </Pressable>
            ))}
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={C.primary} colors={[C.primary]} />
            }
          >
            {q.isLoading ? (
              <SkeletonList count={3} kind="card" />
            ) : msgs.length === 0 ? (
              <EmptyState
                icon="comment-text-multiple"
                title={tab === "open" ? "Nada pendiente" : "Sin resueltos"}
                body={tab === "open" ? "No hay mensajes de soporte esperando respuesta." : ""}
              />
            ) : (
              msgs.map((m) => (
                <MsgCard
                  key={m.id}
                  m={m}
                  busy={resolve.isPending}
                  onResolve={(status) =>
                    resolve.mutate(
                      { id: m.id, status },
                      {
                        onSuccess: () =>
                          toast.success(status === "closed" ? "Resuelto" : "Reabierto"),
                        onError: () => toast.error("No se pudo aplicar"),
                      },
                    )
                  }
                />
              ))
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}
