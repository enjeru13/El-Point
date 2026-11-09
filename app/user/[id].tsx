import { MentionText } from "@/components/community/MentionText";
import { AppText } from "@/components/ui/AppText";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { RankBadge } from "@/components/ui/RankBadge";
import { shortAgo } from "@/lib/community/time";
import { topicLabel } from "@/lib/community/topics";
import { useBlockUser } from "@/lib/queries/blocks";
import { useMyProfile } from "@/lib/queries/me";
import { usePublicProfile, useUserPosts, useUserReviews } from "@/lib/queries/publicProfile";
import { capWidth, useIsTablet } from "@/lib/responsive";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Perfil de otra persona, solo para ver: nivel, ranks, logros y lo que publicó. */
export default function PublicProfileScreen() {
  const { C } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMyProfile();
  const profile = usePublicProfile(id);
  const posts = useUserPosts(id);
  const reviews = useUserReviews(id);
  const blockUser = useBlockUser();
  const [tab, setTab] = useState<"posts" | "ranks">("posts");

  // Tu propio perfil vive en la pestaña Perfil.
  useEffect(() => {
    if (id && me.data?.id === id) router.replace("/(customer)/profile");
  }, [id, me.data?.id, router]);

  const p = profile.data;
  const name = p?.username ? `@${p.username}` : (p?.full_name ?? "Usuario");

  const menu = () =>
    Alert.alert(name, undefined, [
      {
        text: "Bloquear",
        style: "destructive",
        onPress: () =>
          blockUser.mutate(id!, {
            onSuccess: () => {
              toast.success("Bloqueado. Ya no verás lo que publica.");
              router.back();
            },
            onError: () => toast.error("No pudimos bloquear. Intenta de nuevo."),
          }),
      },
      { text: "Cancelar", style: "cancel" },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingTop: insets.top + 6,
          paddingBottom: 8,
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.outlineVariant,
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
        <AppText variant="subtitle" style={{ flex: 1 }} numberOfLines={1}>
          {p ? name : "Perfil"}
        </AppText>
        {p && (
          <Pressable
            onPress={menu}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Más opciones"
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="dots-horizontal" size={22} color={C.onSurface} />
          </Pressable>
        )}
      </View>

      {profile.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.primary} />
      ) : !p ? (
        <EmptyState icon="account" title="Perfil no disponible" body="Esta persona no está disponible en El Point." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 40, ...capWidth(isTablet) }}>
          <View
            style={{
              alignItems: "center",
              gap: 8,
              padding: 22,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: C.surface,
            }}
          >
            <View>
              <Avatar uri={p.avatar_url} size={96} />
              <View
                style={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  minWidth: 30,
                  height: 30,
                  borderRadius: 15,
                  paddingHorizontal: 6,
                  backgroundColor: C.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: C.surface,
                }}
              >
                <AppText variant="label" color="#fff">
                  {p.level}
                </AppText>
              </View>
            </View>
            <AppText variant="title">{name}</AppText>
            {!!p.bio && (
              <AppText variant="body" color={C.onSurfaceVariant} align="center">
                {p.bio}
              </AppText>
            )}
            <RankBadge level={p.level} size="md" />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              { icon: "trophy-outline", value: p.rank_count, label: "Ranks" },
              { icon: "message-circle", value: p.post_count, label: "Publicaciones" },
              { icon: "fire", value: p.missions_done, label: "Logros" },
            ].map((s) => (
              <View
                key={s.label}
                style={{
                  flex: 1,
                  alignItems: "center",
                  gap: 4,
                  paddingVertical: 14,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: C.border,
                  backgroundColor: C.surface,
                }}
              >
                <Icon name={s.icon} size={18} color={C.primary} />
                <AppText variant="heading">{s.value}</AppText>
                <AppText variant="caption" color={C.onSurfaceVariant}>
                  {s.label}
                </AppText>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", backgroundColor: C.surfaceContainerHigh, borderRadius: 12, padding: 3 }}>
            {(
              [
                ["posts", "Comunidad"],
                ["ranks", "Ranks"],
              ] as const
            ).map(([k, label]) => (
              <Pressable
                key={k}
                onPress={() => setTab(k)}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === k }}
                style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9, backgroundColor: tab === k ? C.surface : "transparent" }}
              >
                <AppText variant="bodyStrong" color={tab === k ? C.primary : C.onSurfaceVariant}>
                  {label}
                </AppText>
              </Pressable>
            ))}
          </View>

          {tab === "posts" ? (
            (posts.data ?? []).length === 0 ? (
              <AppText variant="bodySm" color={C.onSurfaceVariant} align="center">
                Todavía no ha publicado en Comunidad.
              </AppText>
            ) : (
              posts.data!.map((post) => (
                <Pressable
                  key={post.id}
                  onPress={() => router.push(`/community/${post.id}` as never)}
                  style={{ gap: 6, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface }}
                >
                  <AppText variant="caption" color={C.onSurfaceVariant}>
                    {topicLabel(post.topic)} · {shortAgo(post.createdAt)}
                  </AppText>
                  <MentionText body={post.body} variant="body" numberOfLines={4} />
                  <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Icon name="heart" size={16} color={C.onSurfaceVariant} />
                      <AppText variant="caption" color={C.onSurfaceVariant}>{post.likeCount}</AppText>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Icon name="message-circle" size={16} color={C.onSurfaceVariant} />
                      <AppText variant="caption" color={C.onSurfaceVariant}>{post.replyCount}</AppText>
                    </View>
                  </View>
                </Pressable>
              ))
            )
          ) : (reviews.data ?? []).length === 0 ? (
            <AppText variant="bodySm" color={C.onSurfaceVariant} align="center">
              Todavía no ha dejado ranks.
            </AppText>
          ) : (
            reviews.data!.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/restaurant/${r.restaurantId}` as never)}
                style={{ gap: 6, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {r.restaurantName}
                  </AppText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Icon name="star" size={14} color={C.secondary} fill={C.secondary} />
                    <AppText variant="label">{r.rating}</AppText>
                  </View>
                </View>
                {!!r.body && (
                  <AppText variant="bodySm" color={C.onSurfaceVariant} numberOfLines={4}>
                    {r.body}
                  </AppText>
                )}
                <AppText variant="caption" color={C.outline}>
                  {shortAgo(r.createdAt)}
                </AppText>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
