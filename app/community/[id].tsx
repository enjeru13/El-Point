import { FeedRow } from "@/components/community/FeedRow";
import { FeedSkeleton } from "@/components/community/FeedSkeleton";
import { ReplyRow } from "@/components/community/ReplyRow";
import { buildThreads } from "@/lib/community/threads";
import { activeMentionQuery, caretAfterEdit, insertMention } from "@/lib/community/mentions";
import { MentionText } from "@/components/community/MentionText";
import { MentionSuggestions } from "@/components/community/MentionSuggestions";
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
  useToggleReplyLike,
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
import { KEYBOARD_DISMISS } from "@/lib/keyboard";
import { useAuthGate } from "@/components/AuthGate";
import { useIsGuest } from "@/lib/session";

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
  const { requireAuth } = useAuthGate();
  const isGuest = useIsGuest();
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
  const [replyTo, setReplyTo] = useState<Reply | null>(null);
  const [caret, setCaret] = useState(0);
  const [forcedSel, setForcedSel] = useState<{ start: number; end: number } | undefined>();
  const mentionQuery = asRestaurantId ? null : activeMentionQuery(text, caret);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inputRef = useRef<TextInput>(null);
  const toggleReplyLike = useToggleReplyLike(id ?? "");

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
    const parent = replyTo;
    setReplyTo(null);
    if (parent) setExpanded((prev) => new Set(prev).add(parent.id));
    createReply.mutate(
      { body, restaurantId: pick?.id, restaurantName: pick?.name, asRestaurantId, parentReplyId: parent?.id ?? null },
      {
        onError: (e) => {
          setText(body);
          setTagged(pick);
          setReplyTo(parent);
          toast.error(errorMessage(errorCode(e)));
        },
      },
    );
  };

  const onReplyMenu = (r: Reply) => {
    if (!requireAuth("report")) return;
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
  const byId = useMemo(() => new Map(replyList.map((r) => [r.id, r])), [replyList]);
  const threads = useMemo(
    () => buildThreads(replyList.map((r) => ({ ...r, parentId: r.parentReplyId }))),
    [replyList],
  );
  const visibleCount = replyList.filter((r) => !r.removed).length;
  const handleOf = (r: Reply | undefined) =>
    r ? (r.asRestaurantName ?? (r.authorUsername ? r.authorUsername : (r.authorName ?? "alguien"))) : null;
  const startReply = (r: Reply) => {
    if (!requireAuth("reply")) return;
    setReplyTo(r);
    inputRef.current?.focus();
  };
  const likeReply = (r: Reply) => {
    if (!requireAuth("like")) return;
    impact("light");
    toggleReplyLike.mutate({ replyId: r.id, like: !r.likedByMe });
  };

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
        <AppText variant="subtitle">{post.data?.kind === "review" ? "Reseña" : "Post"}</AppText>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode={KEYBOARD_DISMISS} contentContainerStyle={{ paddingBottom: 24 }}>
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
                {visibleCount === 0
                  ? "Sin respuestas todavía"
                  : `${visibleCount} ${visibleCount === 1 ? "respuesta" : "respuestas"}`}
              </AppText>
              {threads.map((t) => {
                const open = expanded.has(t.root.id);
                const shown = open ? t.children : t.children.slice(0, 2);
                const hidden = t.children.length - shown.length;
                const rowProps = {
                  onOpenAuthor: (r: Reply) => {
                    if (requireAuth("profile")) router.push(`/user/${r.authorId}` as never);
                  },
                  renderBody: (b: string) => <MentionText body={b} variant="body" />,
                  onOpenRestaurant: actions.onOpenRestaurant,
                  onMenu: onReplyMenu,
                  onReply: ownerCanReply ? startReply : undefined,
                  onToggleLike: likeReply,
                };
                return (
                  <View key={t.root.id}>
                    <ReplyRow
                      reply={t.root}
                      last={shown.length === 0}
                      isAuthor={t.root.authorId === item.authorId && !t.root.asRestaurantId}
                      {...rowProps}
                    />
                    {shown.map((c, i) => (
                      <ReplyRow
                        key={c.id}
                        reply={c}
                        depth={1}
                        last={i === shown.length - 1}
                        replyingTo={c.replyingTo ? handleOf(byId.get(c.replyingTo)) : null}
                        isAuthor={c.authorId === item.authorId && !c.asRestaurantId}
                        {...rowProps}
                      />
                    ))}
                    {hidden > 0 && (
                      <Pressable
                        onPress={() => setExpanded((prev) => new Set(prev).add(t.root.id))}
                        hitSlop={8}
                        accessibilityRole="button"
                        style={{ paddingLeft: 68, paddingBottom: 14 }}
                      >
                        <AppText variant="label" color={C.primary}>
                          Ver {hidden} {hidden === 1 ? "respuesta más" : "respuestas más"}
                        </AppText>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>

        {/* Responder */}
        {item && isGuest && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: C.outlineVariant,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: insets.bottom + 12,
            }}
          >
            <Pressable
              onPress={() => requireAuth("reply")}
              accessibilityRole="button"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 48,
                paddingHorizontal: 16,
                borderRadius: 24,
                backgroundColor: C.surfaceContainerHigh,
              }}
            >
              <Icon name="message-circle" size={20} color={C.primary} />
              <AppText variant="body" color={C.onSurfaceVariant} style={{ flex: 1 }}>
                Crea tu cuenta para responder
              </AppText>
              <Icon name="chevron-right" size={18} color={C.outline} />
            </Pressable>
          </View>
        )}
        {item &&
          !isGuest &&
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
              <MentionSuggestions
                query={mentionQuery}
                postId={id}
                onPick={(u) => {
                  const next = insertMention(text, caret, u);
                  setText(next.text);
                  setCaret(next.caret);
                  setForcedSel({ start: next.caret, end: next.caret });
                }}
              />
              {replyTo && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 48 }}>
                  <Icon name="message-circle" size={14} color={C.primary} />
                  <AppText variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
                    Respondiendo a {handleOf(replyTo)?.startsWith("@") ? "" : "@"}
                    {handleOf(replyTo)}
                  </AppText>
                  <Pressable onPress={() => setReplyTo(null)} hitSlop={10} accessibilityLabel="Cancelar respuesta">
                    <Icon name="close-circle" size={16} color={C.outline} />
                  </Pressable>
                </View>
              )}
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
                    ref={inputRef}
                    value={text}
                    onChangeText={(t) => {
                      const next = t.slice(0, 500);
                      setCaret(caretAfterEdit(text, next));
                      setText(next);
                    }}
                    selection={forcedSel}
                    onSelectionChange={(e) => {
                      setCaret(e.nativeEvent.selection.end);
                      if (forcedSel) setForcedSel(undefined);
                    }}
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
