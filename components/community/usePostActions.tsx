import { ReportSheet, type ReportSheetHandle } from "@/components/ui/ReportSheet";
import { errorMessage } from "@/lib/community/topics";
import { useBlockUser } from "@/lib/queries/blocks";
import { useAuthGate } from "@/components/AuthGate";
import { errorCode, openReviewThread, useDeletePost, useReportPost, useToggleLike, type FeedItem } from "@/lib/queries/community";
import { useMyProfile } from "@/lib/queries/me";
import { REPORT_REASONS } from "@/lib/queries/reviews";
import { useToast } from "@/lib/toast";
import { useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import { Alert } from "react-native";

/**
 * Lo que se puede hacer con una fila del feed (me gusta, abrir, menú de
 * reportar / bloquear / borrar). Lo comparten el feed, el detalle y la
 * sección del perfil del local.
 */
export function usePostActions({ onDeleted }: { onDeleted?: () => void } = {}) {
  const router = useRouter();
  const toast = useToast();
  const { data: me } = useMyProfile();
  const toggleLike = useToggleLike();
  const { requireAuth } = useAuthGate();
  const deletePost = useDeletePost();
  const reportPost = useReportPost();
  const blockUser = useBlockUser();
  const reportRef = useRef<ReportSheetHandle>(null);

  const onToggleLike = useCallback(
    (item: FeedItem) => {
      if (!requireAuth("like")) return;
      toggleLike.mutate(
        { item, liked: item.viewerLiked },
        { onError: () => toast.error("No pudimos guardar tu me gusta. Revisa tu conexión.") },
      );
    },
    [toggleLike, toast, requireAuth],
  );

  const onOpen = useCallback(
    (item: FeedItem) => {
      if (item.kind === "review") {
        // Una reseña también es una conversación: se abre su hilo; el local queda en su tarjeta.
        openReviewThread(item).then(
          (postId) => router.push({ pathname: "/community/[id]", params: { id: postId } }),
          () => toast.error("No pudimos abrir la reseña. Inténtalo de nuevo."),
        );
      } else {
        router.push({ pathname: "/community/[id]", params: { id: item.id } });
      }
    },
    [router, toast],
  );

  const onOpenRestaurant = useCallback(
    (id: string) => router.push({ pathname: "/restaurant/[id]", params: { id } }),
    [router],
  );

  const onMenu = useCallback(
    (item: FeedItem) => {
      if (!requireAuth("report")) return;
      const mine = me?.id === item.authorId;
      const name = item.asRestaurantName ?? item.authorName ?? "esta persona";
      if (mine) {
        if (item.kind !== "post") return;
        Alert.alert("Tu post", undefined, [
          {
            text: "Borrar post",
            style: "destructive",
            onPress: () =>
              Alert.alert("¿Borrar este post?", "Se borra con sus respuestas y no se puede deshacer.", [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Borrar",
                  style: "destructive",
                  onPress: () =>
                    deletePost.mutate(item.id, {
                      onSuccess: () => {
                        toast.success("Post borrado");
                        onDeleted?.();
                      },
                      onError: () => toast.error("No pudimos borrar el post."),
                    }),
                },
              ]),
          },
          { text: "Cancelar", style: "cancel" },
        ]);
        return;
      }
      Alert.alert(item.kind === "review" ? "Reseña" : "Post", undefined, [
        ...(item.kind === "post"
          ? [{ text: "Reportar post", onPress: () => reportRef.current?.present(item.id) }]
          : []),
        {
          text: `Bloquear a ${name}`,
          style: "destructive" as const,
          onPress: () =>
            Alert.alert(`¿Bloquear a ${name}?`, "Dejarás de ver sus posts, respuestas y reseñas.", [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Bloquear",
                style: "destructive",
                onPress: () =>
                  blockUser.mutate(item.authorId, {
                    onSuccess: () => toast.success(`Bloqueaste a ${name}`),
                    onError: () => toast.error("No pudimos bloquear. Inténtalo de nuevo."),
                  }),
              },
            ]),
        },
        { text: "Cancelar", style: "cancel" as const },
      ]);
    },
    [me?.id, deletePost, blockUser, toast, onDeleted, requireAuth],
  );

  const reportSheet = (
    <ReportSheet
      ref={reportRef}
      title="Reportar post"
      subtitle="Cuéntanos qué pasa con este post. Un moderador lo revisará."
      reasons={REPORT_REASONS}
      submitting={reportPost.isPending}
      onSubmit={(postId, reason, note) =>
        reportPost.mutate(
          { postId, reason, note },
          {
            onSuccess: () => {
              reportRef.current?.dismiss();
              toast.success("Gracias. Lo revisaremos pronto.");
            },
            onError: (e) => toast.error(errorMessage(errorCode(e))),
          },
        )
      }
    />
  );

  return { me, onToggleLike, onOpen, onOpenRestaurant, onMenu, reportSheet, reportRef };
}
