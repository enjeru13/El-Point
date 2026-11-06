import { FeedRow } from "@/components/community/FeedRow";
import { FeedSkeleton } from "@/components/community/FeedSkeleton";
import { ReplyRow } from "@/components/community/ReplyRow";
import {
  RestaurantPickerSheet,
  type PickedRestaurant,
  type RestaurantPickerHandle,
} from "@/components/community/RestaurantPickerSheet";
import { usePostActions } from "@/components/community/usePostActions";
import { AppText } from "@/components/ui/AppText";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { ReportSheet, type ReportSheetHandle } from "@/components/ui/ReportSheet";
import { errorMessage } from "@/lib/community/topics";
import { impact } from "@/lib/haptics";
import { useMyBlocks } from "@/lib/queries/blocks";
import { useCategories } from "@/lib/queries/categories";
import {
  errorCode,
  useCreateReply,
  useDeleteReply,
  usePost,
  usePostReplies,
  useReportPost,
  type Reply,
} from "@/lib/queries/community";
import { hasPlan } from "@/lib/plan";
import { useMyRestaurant } from "@/lib/queries/owner";
import { REPORT_REASONS } from "@/lib/queries/reviews";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PostDetailScreen() {
  const { C } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = usePost(id);
  const { data: blocks } = useMyBlocks();
  const blockedIds = useMemo(() => new Set((blocks ?? []).map((b) => b.id)), [blocks]);
  const replies = usePostReplies(id, blockedIds);
  const { data: categories = [] } = useCategories();
  const categoryLabels = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);
  const actions = usePostActions({ onDeleted: () => router.back() });
  const me = actions.me;
  const { data: myRestaurant } = useMyRestaurant();
  const isOwner = me?.role === "restaurant_owner" && !!myRestaurant;
  const asRestaurantId = isOwner ? myRestaurant!.id : null;

  const createReply = useCreateReply(id ?? "");
  const deleteReply = useDeleteReply(id ?? "");
  const reportReply = useReportPost();
  const replyReportRef = useRef<ReportSheetHandle>(null);
  const pickerRef = useRef<RestaurantPickerHandle>(null);
  const [text, setText] = useState("");
  const [tagged, setTagged] = useState<PickedRestaurant | null>(null);

  const item = post.data;
  const ownerMentioned = item?.restaurantId != null && item.restaurantId === myRestaurant?.id;
  const ownerHasPlan = isOwner && myRestaurant!.status === "approved" && hasPlan(myRestaurant);
  const ownerCanReply = !isOwner || (ownerMentioned && ownerHasPlan);
  const ownerNotice = !ownerMentioned
    ? "Tu local solo puede responder en posts que lo mencionan."
    : "Responder como local es parte del plan activo de tu local.";
  const canTag = !isOwner && item?.topic === "recomiendame";

  const send = () => {
    const body = text.trim();
    if (!body || !id) return;
    impact("light");
    setText("");
    const pick = tagged;
    setTagged(null);
    createReply.mutate(
      { body, restaurantId: pick?.id, restaurantName: pick?.name, asRestaurantId },
      {
        onError: (e) => {
          setText(body);
          setTagged(pick);
          toast.error(errorMessage(errorCode(e)));
        },
      },
    );
  };

  const onReplyMenu = (r: Reply) => {
    if (r.authorId === me?.id) {
      Alert.alert("Tu respuesta", undefined, [
        {
          text: "Borrar respuesta",
          style: "destructive",
          onPress: () => deleteReply.mutate(r.id, { onError: () => toast.error("No pudimos borrar la respuesta.") }),
        },
        { text: "Cancelar", style: "cancel" },
      ]);
    } else {
      Alert.alert("Respuesta", undefined, [
        { text: "Reportar respuesta", onPress: () => replyReportRef.current?.present(r.id) },
        { text: "Cancelar", style: "cancel" },
      ]);
    }
  };

  const replyList = replies.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Cabecera */}
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
        <AppText variant="subtitle">Post</AppText>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          {post.isLoading ? (
            <FeedSkeleton />
          ) : post.isError ? (
            <EmptyState
              icon="wifi-off"
              title="No pudimos cargar el post"
              body="Revisa tu conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => post.refetch()}
            />
          ) : !item ? (
            <EmptyState
              icon="comment-text"
              title="Este post no está disponible"
              body="Puede que lo hayan borrado o que esté en revisión."
            />
          ) : (
            <>
              <FeedRow
                item={item}
                detail
                categoryLabels={categoryLabels}
                onOpenRestaurant={actions.onOpenRestaurant}
                onToggleLike={actions.onToggleLike}
                onMenu={actions.onMenu}
              />
              <View style={{ height: 1, backgroundColor: C.outlineVariant }} />
              <AppText
                variant="overline"
                color={C.onSurfaceVariant}
                style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}
              >
                {replyList.length === 0
                  ? "Sin respuestas todavía"
                  : `${replyList.length} ${replyList.length === 1 ? "respuesta" : "respuestas"}`}
              </AppText>
              {replyList.map((r, i) => (
                <ReplyRow
                  key={r.id}
                  reply={r}
                  last={i === replyList.length - 1}
                  onOpenRestaurant={actions.onOpenRestaurant}
                  onMenu={onReplyMenu}
                />
              ))}
            </>
          )}
        </ScrollView>

        {/* Responder */}
        {item &&
          (ownerCanReply ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: C.outlineVariant,
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: insets.bottom + 10,
                gap: 8,
                backgroundColor: C.background,
              }}
            >
              {tagged && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 48 }}>
                  <Icon name="storefront" size={14} color={C.primary} />
                  <AppText variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {tagged.name}
                  </AppText>
                  <Pressable onPress={() => setTagged(null)} hitSlop={10} accessibilityLabel="Quitar local">
                    <Icon name="close-circle" size={16} color={C.outline} />
                  </Pressable>
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
                <Avatar
                  uri={asRestaurantId ? myRestaurant?.logo_url : me?.avatar_url}
                  size={36}
                  icon={asRestaurantId ? "storefront-outline" : "account"}
                  bordered={false}
                />
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "flex-end",
                    borderRadius: 22,
                    backgroundColor: C.surfaceContainer,
                    paddingLeft: 16,
                    paddingRight: 6,
                    minHeight: 44,
                  }}
                >
                  <TextInput
                    value={text}
                    onChangeText={(t) => setText(t.slice(0, 500))}
                    placeholder={`Responde a ${item.asRestaurantName ?? item.authorName ?? "este post"}…`}
                    placeholderTextColor={C.outline}
                    multiline
                    accessibilityLabel="Escribe tu respuesta"
                    style={{
                      flex: 1,
                      maxHeight: 120,
                      // iOS agrega relleno arriba en los multilínea: se fija
                      // arriba y abajo para que el texto quede centrado.
                      paddingTop: 12,
                      paddingBottom: 12,
                      lineHeight: 20,
                      color: C.onSurface,
                      fontFamily: "PlusJakartaSans_500Medium",
                      fontSize: 15,
                    }}
                  />
                  {canTag && (
                    <Pressable
                      onPress={() => pickerRef.current?.present()}
                      accessibilityRole="button"
                      accessibilityLabel="Recomendar un local de El Point"
                      style={{ width: 36, height: 44, alignItems: "center", justifyContent: "center" }}
                    >
                      <Icon name="storefront-outline" size={20} color={tagged ? C.primary : C.onSurfaceVariant} />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={send}
                    disabled={!text.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Enviar respuesta"
                    style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }}
                  >
                    <Icon name="send" size={20} color={text.trim() ? C.primary : C.outline} />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: C.outlineVariant,
                padding: 16,
                paddingBottom: insets.bottom + 16,
              }}
            >
              <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ textAlign: "center" }}>
                {ownerNotice}
              </AppText>
            </View>
          ))}
      </KeyboardAvoidingView>

      <RestaurantPickerSheet ref={pickerRef} allowSuggest={false} onPick={setTagged} />
      {actions.reportSheet}
      <ReportSheet
        ref={replyReportRef}
        title="Reportar respuesta"
        subtitle="Cuéntanos qué pasa con esta respuesta. Un moderador la revisará."
        reasons={REPORT_REASONS}
        submitting={reportReply.isPending}
        onSubmit={(replyId, reason, note) =>
          reportReply.mutate(
            { replyId, reason, note },
            {
              onSuccess: () => {
                replyReportRef.current?.dismiss();
                toast.success("Gracias. Lo revisaremos pronto.");
              },
              onError: (e) => toast.error(errorMessage(errorCode(e))),
            },
          )
        }
      />
    </View>
  );
}
