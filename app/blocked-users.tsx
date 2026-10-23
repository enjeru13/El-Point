import { Alert, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useMyBlocks, useUnblockUser, type BlockedUser } from "@/lib/queries/blocks";
import { AppText } from "@/components/ui/AppText";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { capWidth, FORM_MAX_W, useIsTablet } from "@/lib/responsive";

function displayName(u: BlockedUser): string {
  return u.username ? `@${u.username}` : (u.full_name ?? "Usuario");
}

export default function BlockedUsersScreen() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();
  const blocksQ = useMyBlocks();
  const unblock = useUnblockUser();
  const users = blocksQ.data ?? [];

  function confirmUnblock(u: BlockedUser) {
    Alert.alert(
      `Desbloquear a ${displayName(u)}`,
      "Volverás a ver sus reseñas en los locales.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desbloquear",
          onPress: () =>
            unblock.mutate(u.id, {
              onSuccess: () => toast.success("Usuario desbloqueado"),
              onError: () => toast.error("No se pudo desbloquear"),
            }),
        },
      ],
    );
  }

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
          }}
        >
          <Icon name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1 }}>
          Usuarios bloqueados
        </AppText>
      </View>

      {blocksQ.isLoading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={64} radius={18} />
          <Skeleton height={64} radius={18} />
        </View>
      ) : users.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="account-cancel-outline"
            title="No has bloqueado a nadie"
            body="Si alguien te molesta con sus reseñas, tócale “Bloquear” desde su reseña y dejarás de verlo."
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: insets.bottom + 40, ...capWidth(isTablet, FORM_MAX_W) }}
        >
          <AppText variant="bodySm" color={C.onSurfaceVariant}>
            No ves las reseñas de estas personas. Ellas no se enteran de que las bloqueaste.
          </AppText>
          <View style={{ borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
            {users.map((u, i) => (
              <View
                key={u.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: C.outlineVariant,
                }}
              >
                <Avatar uri={u.avatar_url} size={40} />
                <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {displayName(u)}
                </AppText>
                <Button
                  label="Desbloquear"
                  onPress={() => confirmUnblock(u)}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  disabled={unblock.isPending}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
