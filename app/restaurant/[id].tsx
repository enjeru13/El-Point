import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Icon } from "@/components/ui/Icon";
import { StarRow } from "@/components/ui/StarRow";
import { Avatar } from "@/components/ui/Avatar";
import { AppText } from "@/components/ui/AppText";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { RankBadge } from "@/components/ui/RankBadge";
import { useRestaurant } from "@/lib/queries/restaurants";
import {
  useReviews,
  useSubmitReview,
  useUpdateReview,
  useDeleteReview,
  useDeleteReply,
  useReportReview,
  useToggleHelpful,
  useReplyToReview,
  canEditReview,
  REPORT_REASONS,
  type Review,
  type ReportReason,
} from "@/lib/queries/reviews";
import {
  useReportRestaurant,
  RESTAURANT_REPORT_REASONS,
  type RestaurantReportReason,
} from "@/lib/queries/restaurants";
import { ReportSheet, type ReportSheetHandle } from "@/components/ui/ReportSheet";
import { whatsappUrl, instagramUrl, instagramHandle } from "@/lib/contact";
import { useMyProfile } from "@/lib/queries/me";
import { useFavoriteIds, useToggleFavorite } from "@/lib/queries/feed";
import { useToast } from "@/lib/toast";
import { impact } from "@/lib/haptics";
import { isOpenNow, formatRange, DAY_LABELS_LONG } from "@/lib/hours";
import { useTheme } from "@/lib/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priceLabel(level: number | null): string {
  if (!level || level < 1) return "";
  return "$".repeat(Math.min(level, 3));
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} ${d === 1 ? "día" : "días"}`;
  const w = Math.floor(d / 7);
  if (w < 5) return `Hace ${w} ${w === 1 ? "semana" : "semanas"}`;
  const mo = Math.floor(d / 30);
  return `Hace ${mo} ${mo === 1 ? "mes" : "meses"}`;
}

function authorName(a: Review["author"]): string {
  return a?.username ? `@${a.username}` : (a?.full_name ?? "Anónimo");
}

// ─── Componentes ──────────────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)}>
          <Icon
            name={i <= value ? "star" : "star-outline"}
            size={36}
            color={i <= value ? C.secondary : C.outlineVariant}
          />
        </Pressable>
      ))}
    </View>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

const RATING_LABELS = [
  "",
  "Pésimo 😬",
  "Regular 😐",
  "Bueno 👍",
  "Muy bueno 🔥",
  "Excelente ⭐",
];

export interface ReviewSheetHandle {
  present: () => void;
  dismiss: () => void;
}

const ReviewSheet = forwardRef<
  ReviewSheetHandle,
  {
    restaurantName: string;
    submitting: boolean;
    errorMessage: string | null;
    editing: { id: string; rating: number; body: string } | null;
    onSubmit: (rating: number, body: string, photoUris: string[]) => void;
  }
>(({ restaurantName, submitting, errorMessage, editing, onSubmit }, ref) => {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const RATING_COLORS = [
    "",
    C.error,
    C.outline,
    C.secondary,
    C.primaryContainer,
    C.secondary,
  ];
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["88%"], []);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const reset = useCallback(() => {
    setRating(0);
    setComment("");
    setPhotos([]);
  }, []);

  useImperativeHandle(ref, () => ({
    present: () => {
      if (editing) {
        setRating(editing.rating);
        setComment(editing.body);
        setPhotos([]);
      } else {
        reset();
      }
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }), [editing, reset]);

  function addPhotos() {
    const remaining = 4 - photos.length;
    Alert.alert("Agregar foto", undefined, [
      { text: "Tomar foto", onPress: () => addFromCamera() },
      { text: "Elegir de galería", onPress: () => addFromLibrary(remaining) },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function addFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (r.canceled) return;
    setPhotos((prev) => [...prev, ...r.assets.map((a) => a.uri)].slice(0, 4));
  }

  async function addFromLibrary(limit: number) {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: limit,
      quality: 0.8,
    });
    if (r.canceled) return;
    setPhotos((prev) => [...prev, ...r.assets.map((a) => a.uri)].slice(0, 4));
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.45}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: C.outlineVariant, width: 44 }}
      backgroundStyle={{
        backgroundColor: C.surface,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: C.border,
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 14,
          borderBottomWidth: 2,
          borderBottomColor: C.outlineVariant,
        }}
      >
        <AppText variant="overline" color={C.onSurfaceVariant}>
          {editing ? "EDITAR TU RANK" : "RANKEAR"}
        </AppText>
        <AppText variant="title" style={{ fontSize: 22, lineHeight: 27 }} numberOfLines={1}>
          {restaurantName}
        </AppText>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Estrellas */}
        <View style={{ alignItems: "center", gap: 12 }}>
          <StarPicker value={rating} onChange={setRating} />
          {rating > 0 ? (
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 99,
                backgroundColor: C.surfaceContainerLow,
                borderWidth: 2,
                borderColor: C.outlineVariant,
              }}
            >
              <AppText variant="bodyStrong" color={RATING_COLORS[rating]}>
                {RATING_LABELS[rating]}
              </AppText>
            </View>
          ) : (
            <AppText variant="bodySm" color={C.outline}>
              ¿Cuántas estrellas le das?
            </AppText>
          )}
        </View>

        <View style={{ height: 1, backgroundColor: C.outlineVariant }} />

        {/* Comentario */}
        <View style={{ gap: 8 }}>
          <Field
            label="TU EXPERIENCIA"
            value={comment}
            onChangeText={(t) => setComment(t.slice(0, 500))}
            placeholder="Cuéntale a la comunidad qué tal estuvo…"
            multiline
          />
          <AppText
            variant="caption"
            color={comment.trim().length < 10 ? C.error : C.outline}
            align="right"
            style={{ fontSize: 12 }}
          >
            {comment.length < 10
              ? `Mínimo 10 caracteres · ${comment.length} / 500`
              : `${comment.length} / 500`}
          </AppText>
        </View>

        {/* Fotos */}
        <View style={{ gap: 8, display: editing ? "none" : "flex" }}>
          <AppText variant="overline" color={C.onSurfaceVariant}>
            FOTOS (OPCIONAL)
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {photos.map((uri, i) => (
              <View key={uri + i} style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", borderWidth: 2, borderColor: C.border }}>
                <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                <Pressable
                  onPress={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                  style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}
                >
                  <Icon name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < 4 && (
              <Pressable
                onPress={addPhotos}
                style={{ width: 64, height: 64, borderRadius: 12, borderWidth: 2, borderStyle: "dashed", borderColor: C.outlineVariant, alignItems: "center", justifyContent: "center", backgroundColor: C.surfaceContainerLow }}
              >
                <Icon name="camera-plus-outline" size={22} color={C.primary} />
              </Pressable>
            )}
          </View>
        </View>

        {errorMessage && (
          <AppText variant="label" color={C.error}>
            {errorMessage}
          </AppText>
        )}

        <Button
          label={
            editing
              ? submitting
                ? "Guardando…"
                : "Guardar cambios"
              : submitting
                ? "Publicando…"
                : "Publicar Rank"
          }
          onPress={() => onSubmit(rating, comment.trim(), photos)}
          disabled={!(rating > 0 && comment.trim().length >= 10)}
          loading={submitting}
          icon={editing ? "check" : "fire"}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

ReviewSheet.displayName = "ReviewSheet";

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function RestaurantProfileScreen() {
  const { C, shadow } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const restaurantQ = useRestaurant(id);
  const reviewsQ = useReviews(id);
  const submitReview = useSubmitReview(id);
  const updateReview = useUpdateReview(id);
  const deleteReview = useDeleteReview(id);
  const deleteReply = useDeleteReply(id);
  const reportReview = useReportReview(id);
  const reportRestaurant = useReportRestaurant(id);
  const toggleHelpful = useToggleHelpful(id);
  const replyMut = useReplyToReview(id);
  const myProfileQ = useMyProfile();
  const favIdsQ = useFavoriteIds();
  const toggleFav = useToggleFavorite();
  const toast = useToast();

  const saved = !!id && (favIdsQ.data?.has(id) ?? false);
  function onToggleSave() {
    if (!id) return;
    impact("light");
    toggleFav.mutate(
      { restaurantId: id, favorited: saved },
      { onError: () => toast.error("No se pudo actualizar favoritos. ¿Iniciaste sesión?") },
    );
  }

  async function onShare() {
    const r = restaurantQ.data;
    if (!r) return;

    const mapsQuery = encodeURIComponent(
      r.address ? `${r.name}, ${r.address}` : `${r.name}, San Cristóbal`,
    );
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    const appUrl = `elpoint://restaurant/${r.id}`;

    const cat = r.categories[0]?.label;
    const ratingLine =
      r.rating_count > 0
        ? `★ ${r.rating_avg} (${r.rating_count} ${r.rating_count === 1 ? "rank" : "ranks"})${cat ? ` · ${cat}` : ""}`
        : `Nuevo en El Point${cat ? ` · ${cat}` : ""}`;

    const lines = [
      r.name,
      ratingLine,
      r.address ? `📍 ${r.address}` : null,
      "",
      `Cómo llegar: ${mapsUrl}`,
      `Abrir en El Point: ${appUrl}`,
    ].filter((l) => l !== null);

    try {
      await Share.share({
        title: `${r.name} · El Point`,
        message: lines.join("\n"),
        url: mapsUrl,
      });
    } catch {
      // usuario canceló el diálogo
    }
  }

  const reviewSheetRef = useRef<ReviewSheetHandle>(null);
  const reportSheetRef = useRef<ReportSheetHandle>(null);
  const restaurantReportSheetRef = useRef<ReportSheetHandle>(null);
  const [editingReview, setEditingReview] = useState<
    { id: string; rating: number; body: string } | null
  >(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [hoursOpen, setHoursOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([restaurantQ.refetch(), reviewsQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  const HERO_H = 320;
  const headerBg = scrollY.interpolate({
    inputRange: [HERO_H - 80, HERO_H - 20],
    outputRange: ["rgba(251,248,255,0)", "rgba(251,248,255,1)"],
    extrapolate: "clamp",
  });
  const headerBorder = scrollY.interpolate({
    inputRange: [HERO_H - 80, HERO_H - 20],
    outputRange: [0, 2],
    extrapolate: "clamp",
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [HERO_H - 60, HERO_H],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const btnBg = scrollY.interpolate({
    inputRange: [HERO_H - 80, HERO_H - 20],
    outputRange: ["rgba(252,249,248,0.92)", "rgba(252,249,248,0)"],
    extrapolate: "clamp",
  });
  const btnBorder = scrollY.interpolate({
    inputRange: [HERO_H - 80, HERO_H - 20],
    outputRange: [2, 0],
    extrapolate: "clamp",
  });

  // ── Loading / error ──────────────────────────────────────────────────────────
  if (restaurantQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface }}>
        <Skeleton height={HERO_H} radius={0} />
        <View style={{ padding: 16, gap: 16 }}>
          <Skeleton height={48} radius={16} />
          <Skeleton height={140} radius={20} />
          <Skeleton width="50%" height={20} />
          <Skeleton height={90} radius={20} />
          <Skeleton height={90} radius={20} />
        </View>
      </View>
    );
  }

  if (restaurantQ.isError || !restaurantQ.data) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.surface,
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
        }}
      >
        <Icon name="food-off-outline" size={48} color={C.outline} />
        <AppText variant="heading" align="center">
          No pudimos cargar este lugar
        </AppText>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button label="Reintentar" onPress={() => restaurantQ.refetch()} size="sm" fullWidth={false} />
          <Button label="Volver" onPress={() => router.back()} variant="secondary" size="sm" fullWidth={false} />
        </View>
      </View>
    );
  }

  const restaurant = restaurantQ.data;
  const reviews = reviewsQ.data ?? [];
  // Distribución sólo con reseñas visibles (una oculta propia no debe sesgarla).
  const ratedReviews = reviews.filter((r) => r.moderation === "visible");
  const isOwnerHere = !!myProfileQ.data?.id && myProfileQ.data.id === restaurant.owner_id;
  const heroIcon = restaurant.categories[0]?.icon ?? "silverware-fork-knife";
  const priceStr = priceLabel(restaurant.price_level);
  const dist = [5, 4, 3, 2, 1].map(
    (s) => ratedReviews.filter((r) => r.rating === s).length,
  );
  const totalRated = ratedReviews.length || restaurant.rating_count;

  function handleSubmit(rating: number, body: string, photoUris: string[]) {
    if (editingReview) {
      updateReview.mutate(
        { reviewId: editingReview.id, rating, body },
        {
          onSuccess: () => {
            reviewSheetRef.current?.dismiss();
            setEditingReview(null);
            toast.success("Reseña actualizada");
          },
          onError: () => toast.error("No se pudo actualizar la reseña."),
        },
      );
      return;
    }
    submitReview.mutate(
      { rating, body, photoUris },
      {
        onSuccess: () => {
          reviewSheetRef.current?.dismiss();
          toast.success("¡Rank publicado! +10 XP");
        },
        onError: () => toast.error("No se pudo publicar. ¿Iniciaste sesión?"),
      },
    );
  }

  function startCreateReview() {
    setEditingReview(null);
    reviewSheetRef.current?.present();
  }

  function startEditReview(r: Review) {
    setEditingReview({ id: r.id, rating: r.rating, body: r.body });
    reviewSheetRef.current?.present();
  }

  function confirmDeleteReview(reviewId: string) {
    Alert.alert(
      "Eliminar reseña",
      "Se borrará para siempre. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () =>
            deleteReview.mutate(reviewId, {
              onSuccess: () => toast.success("Reseña eliminada"),
              onError: () => toast.error("No se pudo eliminar."),
            }),
        },
      ],
    );
  }

  function handleReport(reviewId: string, reason: string, note: string) {
    reportReview.mutate(
      { reviewId, reason: reason as ReportReason, note },
      {
        onSuccess: () => {
          reportSheetRef.current?.dismiss();
          toast.success("Reporte enviado. Gracias por avisar.");
        },
        onError: (e: any) =>
          toast.error(e?.message ?? "No se pudo enviar el reporte."),
      },
    );
  }

  function handleReportRestaurant(_id: string, reason: string, note: string) {
    reportRestaurant.mutate(
      { reason: reason as RestaurantReportReason, note },
      {
        onSuccess: () => {
          restaurantReportSheetRef.current?.dismiss();
          toast.success("Reporte enviado. Gracias por avisar.");
        },
        onError: (e: any) =>
          toast.error(e?.message ?? "No se pudo enviar el reporte."),
      },
    );
  }

  function confirmDeleteReply(reviewId: string) {
    Alert.alert(
      "Eliminar respuesta",
      "Se borrará tu respuesta a esta reseña. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () =>
            deleteReply.mutate(reviewId, {
              onSuccess: () => toast.success("Respuesta eliminada"),
              onError: () => toast.error("No se pudo eliminar."),
            }),
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={insets.top + 8}
            tintColor="#fff"
            colors={[C.primary]}
          />
        }
      >
        {/* ── Hero ── */}
        <View
          style={{
            height: 320,
            backgroundColor: C.primaryFixed,
            alignItems: "center",
            justifyContent: "center",
            borderBottomWidth: 2,
            borderBottomColor: C.border,
          }}
        >
          {restaurant.cover_url ? (
            <Image
              source={{ uri: restaurant.cover_url }}
              style={{ position: "absolute", width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Icon
              name={heroIcon}
              size={120}
              color={C.onSurface}
              style={{ opacity: 0.2 }}
            />
          )}

          {/* Scrim degradado para legibilidad sobre la foto */}
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 190 }}>
            <View style={{ flex: 1, backgroundColor: "rgba(28,27,27,0.12)" }} />
            <View style={{ flex: 1, backgroundColor: "rgba(28,27,27,0.34)" }} />
            <View style={{ flex: 1, backgroundColor: "rgba(28,27,27,0.62)" }} />
          </View>

          {/* Info overlay */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              gap: 8,
            }}
          >
            {/* Chips */}
            {restaurant.categories.length > 0 && (
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {restaurant.categories.map((c) => (
                  <View
                    key={c.slug}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 99,
                      backgroundColor: C.secondaryContainer,
                      borderWidth: 2,
                      borderColor: C.border,
                    }}
                  >
                    <AppText variant="caption" style={{ fontSize: 12 }}>
                      {c.label.toUpperCase()}
                    </AppText>
                  </View>
                ))}
              </View>
            )}

            <AppText variant="display" color="#fff" style={{ fontSize: 36, lineHeight: 40 }}>
              {restaurant.name}
            </AppText>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Icon name="star" size={16} color={C.secondaryContainer} />
                <AppText variant="bodyStrong" color="#fff">
                  {restaurant.rating_count > 0
                    ? `${restaurant.rating_avg} (${restaurant.rating_count})`
                    : "Sin ranks aún"}
                </AppText>
              </View>
              {(restaurant.address || priceStr) && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Icon
                    name="map-marker"
                    size={16}
                    color="rgba(255,255,255,0.7)"
                  />
                  <AppText variant="body" color="rgba(255,255,255,0.85)">
                    {[priceStr].filter(Boolean).join(" • ") || "Ver ubicación"}
                  </AppText>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Contenido ── */}
        <View style={{ padding: 16, gap: 20 }}>
          {/* ── Aviso: es tu local ── */}
          {isOwnerHere && (
            <Pressable
              onPress={() => router.push("/(owner)/profile")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 12,
                borderRadius: 16,
                backgroundColor: C.primaryFixed,
                borderWidth: 2,
                borderColor: C.border,
              }}
            >
              <Icon name="storefront-outline" size={18} color={C.primary} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" color={C.primary}>
                  Este es tu local
                </AppText>
                <AppText variant="caption" color={C.onSurfaceVariant}>
                  Así es como lo ven los clientes
                </AppText>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Icon name="pencil-outline" size={14} color={C.primary} />
                <AppText variant="label" color={C.primary}>
                  Editar
                </AppText>
              </View>
            </Pressable>
          )}

          {/* ── Promos ── */}
          {restaurant.promo_text && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 14,
                borderRadius: 16,
                backgroundColor: C.primaryContainer,
                borderWidth: 2,
                borderColor: C.border,
                borderLeftWidth: 6,
                ...shadow.sm,
              }}
            >
              <Icon name="tag" size={20} color={C.onSurface} />
              <View style={{ flex: 1 }}>
                <AppText variant="overline">PROMOS</AppText>
                <AppText variant="bodyStrong">
                  {restaurant.promo_text}
                </AppText>
              </View>
            </View>
          )}

          {/* ── Acciones ── */}
          {!isOwnerHere && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                label="Rankear"
                onPress={startCreateReview}
                icon="fire"
                size="sm"
                fullWidth={false}
                style={{ flex: 2 }}
              />
              <Button
                label="Ir"
                onPress={() =>
                  restaurant.address &&
                  Linking.openURL(
                    `https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`,
                  )
                }
                disabled={!restaurant.address}
                variant="secondary"
                icon="navigation-variant"
                iconColor={C.secondary}
                size="sm"
                fullWidth={false}
                style={{ flex: 1 }}
              />
            </View>
          )}

          {/* ── Info ── */}
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: C.border,
              overflow: "hidden",
              ...shadow.sm,
            }}
          >
            {/* Horario */}
            {(() => {
              const os = isOpenNow(restaurant.hours);
              const canExpand = !!restaurant.hours;
              return (
                <View style={{ borderBottomWidth: 2, borderBottomColor: C.outlineVariant }}>
                  <Pressable
                    onPress={() => canExpand && setHoursOpen((v) => !v)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: os.open ? C.secondaryContainer : C.error + "22", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="clock-outline" size={18} color={os.open ? C.secondary : C.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" color={os.open ? C.secondary : C.error}>
                        {os.open ? "Abierto ahora" : "Cerrado"}
                      </AppText>
                      <AppText variant="bodySm" color={C.onSurfaceVariant}>
                        {os.label.replace(/^(Abierto|Cerrado)( ·)? ?/, "")}
                      </AppText>
                    </View>
                    {canExpand && (
                      <Icon name={hoursOpen ? "chevron-right" : "chevron-right"} size={18} color={C.outline} style={{ transform: [{ rotate: hoursOpen ? "90deg" : "0deg" }] }} />
                    )}
                  </Pressable>
                  {hoursOpen && restaurant.hours && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 4 }}>
                      {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                        const d = restaurant.hours!.days[dow];
                        const today = new Date().getDay() === dow;
                        return (
                          <View key={dow} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <AppText variant={today ? "label" : "bodySm"} color={today ? C.primary : C.onSurfaceVariant} style={today ? { fontFamily: "PlusJakartaSans_700Bold" } : undefined}>
                              {DAY_LABELS_LONG[dow]}
                            </AppText>
                            <AppText variant="bodySm" color={today ? C.primary : C.onSurfaceVariant} style={today ? { fontFamily: "PlusJakartaSans_700Bold" } : undefined}>
                              {formatRange(d)}
                            </AppText>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Dirección */}
            {restaurant.address && (
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `https://maps.google.com/?q=${encodeURIComponent(restaurant.address!)}`,
                  )
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  borderBottomWidth: 2,
                  borderBottomColor: C.outlineVariant,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: C.primaryFixed,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="map-marker-outline" size={18} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">
                    {restaurant.address}
                  </AppText>
                </View>
                <Icon name="chevron-right" size={18} color={C.outline} />
              </Pressable>
            )}

            {/* Teléfono */}
            {restaurant.phone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  borderBottomWidth: 2,
                  borderBottomColor: C.outlineVariant,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: C.secondaryContainer,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="phone-outline" size={18} color={C.secondary} />
                </View>
                <AppText variant="bodyStrong" color={C.secondary} style={{ flex: 1 }}>
                  {restaurant.phone}
                </AppText>
                <Icon name="chevron-right" size={18} color={C.outline} />
              </Pressable>
            )}

            {/* WhatsApp */}
            {whatsappUrl(restaurant.whatsapp) && (
              <Pressable
                onPress={() => Linking.openURL(whatsappUrl(restaurant.whatsapp)!)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  borderBottomWidth: 2,
                  borderBottomColor: C.outlineVariant,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: C.secondaryContainer,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="whatsapp" size={18} color={C.secondary} />
                </View>
                <AppText variant="bodyStrong" color={C.secondary} style={{ flex: 1 }}>
                  {restaurant.whatsapp}
                </AppText>
                <Icon name="chevron-right" size={18} color={C.outline} />
              </Pressable>
            )}

            {/* Instagram */}
            {instagramUrl(restaurant.instagram) && (
              <Pressable
                onPress={() => Linking.openURL(instagramUrl(restaurant.instagram)!)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: C.tertiaryContainer,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="instagram" size={18} color={C.tertiary} />
                </View>
                <AppText variant="bodyStrong" color={C.tertiary} style={{ flex: 1 }}>
                  @{instagramHandle(restaurant.instagram)}
                </AppText>
                <Icon name="chevron-right" size={18} color={C.outline} />
              </Pressable>
            )}
          </View>

          {/* ── Menú PDF ── */}
          {restaurant.menu_pdf_url && (
            <Pressable
              onPress={() => Linking.openURL(restaurant.menu_pdf_url!)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                padding: 18,
                borderRadius: 20,
                backgroundColor: C.primaryFixed,
                borderWidth: 2,
                borderColor: C.border,
                ...shadow.md,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: C.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: C.border,
                }}
              >
                <Icon name="file-pdf-box" size={26} color={C.onSurface} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="heading" style={{ fontSize: 17 }}>
                  Ver menú completo
                </AppText>
                <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 2 }}>
                  Abre el menú en PDF
                </AppText>
              </View>
              <Icon name="arrow-right" size={20} color={C.primary} />
            </Pressable>
          )}

          {/* ── Historia ── */}
          {restaurant.description && (
            <View
              style={{
                backgroundColor: C.tertiaryContainer,
                borderRadius: 20,
                padding: 18,
                gap: 8,
                borderWidth: 2,
                borderColor: C.border,
                ...shadow.sm,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon name="book-open-outline" size={18} color={C.tertiary} />
                <AppText variant="heading">Nuestra historia</AppText>
              </View>
              <AppText variant="body" style={{ lineHeight: 22, opacity: 0.85 }}>
                {restaurant.description}
              </AppText>
            </View>
          )}

          {/* ── Comodidades ── */}
          {restaurant.amenities.length > 0 && (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="check-circle" size={18} color={C.primary} />
                <AppText variant="heading" style={{ fontSize: 20, lineHeight: 25 }}>
                  Comodidades
                </AppText>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {restaurant.amenities.map((a) => (
                  <View
                    key={a.slug}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 16,
                      backgroundColor: C.surface,
                      borderWidth: 2,
                      borderColor: C.border,
                    }}
                  >
                    <Icon name={a.icon} size={17} color={C.primary} />
                    <AppText variant="bodySm">{a.label}</AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Comunidad / Reviews ── */}
          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon
                  name="comment-text-multiple"
                  size={20}
                  color={C.primary}
                />
                <AppText variant="heading" style={{ fontSize: 20, lineHeight: 25 }}>
                  Comunidad
                </AppText>
              </View>
              {!isOwnerHere && (
                <Button
                  label="Deja tu rank"
                  onPress={startCreateReview}
                  icon="fire"
                  size="sm"
                  fullWidth={false}
                />
              )}
            </View>

            {/* Rating summary */}
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: C.border,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                ...shadow.sm,
              }}
            >
              <View style={{ alignItems: "center", gap: 4 }}>
                <AppText variant="display" color={C.primary} style={{ fontSize: 48, lineHeight: 52 }}>
                  {restaurant.rating_count > 0 ? restaurant.rating_avg : "–"}
                </AppText>
                <StarRow rating={Math.round(restaurant.rating_avg)} size={14} />
                <AppText variant="label" color={C.outline}>
                  {restaurant.rating_count}{" "}
                  {restaurant.rating_count === 1 ? "rank" : "ranks"}
                </AppText>
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                {[5, 4, 3, 2, 1].map((star, idx) => {
                  const count = dist[idx];
                  const pct = totalRated > 0 ? count / totalRated : 0;
                  return (
                    <View
                      key={star}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <AppText variant="label" color={C.outline} style={{ fontSize: 15, width: 8 }}>
                        {star}
                      </AppText>
                      <Icon name="star" size={10} color={C.secondary} />
                      <View
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 99,
                          backgroundColor: C.surfaceContainerHigh,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            width: `${pct * 100}%`,
                            height: "100%",
                            borderRadius: 99,
                            backgroundColor: C.secondary,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Estado carga / vacío / lista */}
            {reviewsQ.isLoading ? (
              <View style={{ gap: 12 }}>
                {[0, 1].map((i) => (
                  <View
                    key={i}
                    style={{
                      backgroundColor: C.surface,
                      borderRadius: 20,
                      padding: 16,
                      gap: 10,
                      borderWidth: 2,
                      borderColor: C.border,
                      ...shadow.sm,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Skeleton width={40} height={40} radius={20} />
                      <View style={{ gap: 6 }}>
                        <Skeleton width={120} height={14} />
                        <Skeleton width={80} height={11} />
                      </View>
                    </View>
                    <Skeleton height={40} radius={8} />
                  </View>
                ))}
              </View>
            ) : reviews.length === 0 ? (
              <View
                style={{ paddingVertical: 32, alignItems: "center", gap: 8 }}
              >
                <Icon
                  name="comment-text-multiple"
                  size={36}
                  color={C.outlineVariant}
                />
                <AppText variant="bodySm" color={C.outline} align="center">
                  {isOwnerHere
                    ? "Aún no tienes reseñas. Comparte tu local para recibir las primeras."
                    : "Todavía nadie rankea este lugar. Sé el primero."}
                </AppText>
              </View>
            ) : (
              reviews.map((r) => {
                const isMine =
                  !!myProfileQ.data?.id && myProfileQ.data.id === r.author?.id;
                const reviewEdited =
                  new Date(r.updated_at).getTime() -
                    new Date(r.created_at).getTime() >
                  60000;
                const hiddenForMe = isMine && r.moderation !== "visible";
                return (
                <View
                  key={r.id}
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: 20,
                    padding: 16,
                    gap: 12,
                    borderWidth: 2,
                    borderColor: hiddenForMe ? C.error : C.border,
                    ...shadow.sm,
                  }}
                >
                  {hiddenForMe && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        padding: 10,
                        borderRadius: 12,
                        backgroundColor: C.error + "22",
                      }}
                    >
                      <Icon
                        name={
                          r.moderation === "removed"
                            ? "close-circle"
                            : "shield-alert-outline"
                        }
                        size={16}
                        color={C.error}
                      />
                      <AppText variant="caption" color={C.error} style={{ flex: 1 }}>
                        {r.moderation === "removed"
                          ? "Eliminada por incumplir las normas de la comunidad. Solo tú ves esto."
                          : "En revisión: recibimos reportes sobre esta reseña. Un moderador decidirá si se mantiene."}
                      </AppText>
                    </View>
                  )}

                  {/* Header reviewer */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Avatar uri={r.author?.avatar_url} size={40} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">
                        {authorName(r.author)}
                      </AppText>
                      <View style={{ marginTop: 3 }}>
                        <RankBadge level={r.author?.level ?? 1} />
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <StarRow rating={r.rating} size={12} />
                      <AppText variant="label" color={C.outline}>
                        {timeAgo(r.created_at)}
                        {reviewEdited ? " · editado" : ""}
                      </AppText>
                    </View>
                  </View>

                  {/* Comment */}
                  <AppText variant="body" color={C.onSurfaceVariant}>
                    {r.body}
                  </AppText>

                  {/* Acciones del autor */}
                  {isMine && (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 18,
                        alignItems: "center",
                      }}
                    >
                      {canEditReview(r) && (
                        <Pressable
                          onPress={() => startEditReview(r)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                        >
                          <Icon name="pencil-outline" size={15} color={C.primary} />
                          <AppText variant="label" color={C.primary}>
                            Editar
                          </AppText>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => confirmDeleteReview(r.id)}
                        disabled={deleteReview.isPending}
                        style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                      >
                        <Icon name="delete-outline" size={15} color={C.error} />
                        <AppText variant="label" color={C.error}>
                          Eliminar
                        </AppText>
                      </Pressable>
                      {!canEditReview(r) && (
                        <AppText variant="caption" color={C.outline} style={{ flex: 1 }}>
                          Ya no se puede editar (pasaron 24 h)
                        </AppText>
                      )}
                    </View>
                  )}

                  {/* Fotos */}
                  {r.photos.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {r.photos.map((uri) => (
                        <Image
                          key={uri}
                          source={{ uri }}
                          style={{ width: 96, height: 96, borderRadius: 12, borderWidth: 2, borderColor: C.border }}
                          contentFit="cover"
                          transition={150}
                        />
                      ))}
                    </ScrollView>
                  )}

                  {/* Respuesta del local */}
                  {replyingId === r.id ? (
                    <View style={{ gap: 8 }}>
                      <Field
                        value={replyText}
                        onChangeText={(t) => setReplyText(t.slice(0, 500))}
                        placeholder="Responde a este cliente…"
                        multiline
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Button
                          label="Cancelar"
                          onPress={() => { setReplyingId(null); setReplyText(""); }}
                          variant="secondary"
                          size="sm"
                          fullWidth={false}
                        />
                        <Button
                          label={r.reply ? "Guardar" : "Enviar"}
                          onPress={() =>
                            replyMut.mutate(
                              { reviewId: r.id, body: replyText },
                              {
                                onSuccess: () => {
                                  setReplyingId(null);
                                  setReplyText("");
                                  toast.success(
                                    r.reply
                                      ? "Respuesta actualizada"
                                      : "Respuesta enviada",
                                  );
                                },
                                onError: () =>
                                  toast.error("No se pudo enviar la respuesta"),
                              },
                            )
                          }
                          disabled={replyText.trim().length === 0}
                          loading={replyMut.isPending}
                          icon="reply"
                          size="sm"
                          fullWidth={false}
                        />
                      </View>
                    </View>
                  ) : r.reply ? (
                    <View
                      style={{
                        marginLeft: 12,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: C.surfaceContainerLow,
                        borderLeftWidth: 3,
                        borderLeftColor: C.secondary,
                        gap: 4,
                      }}
                    >
                      <AppText variant="caption" color={C.secondary} style={{ fontSize: 12 }}>
                        RESPUESTA DEL LOCAL · {timeAgo(r.reply.created_at)}
                        {new Date(r.reply.updated_at).getTime() -
                          new Date(r.reply.created_at).getTime() >
                        60000
                          ? " · editado"
                          : ""}
                      </AppText>
                      <AppText variant="bodySm" style={{ fontSize: 14, lineHeight: 20 }}>
                        {r.reply.body}
                      </AppText>
                      {isOwnerHere && (
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 18,
                            marginTop: 4,
                          }}
                        >
                          <Pressable
                            onPress={() => {
                              setReplyingId(r.id);
                              setReplyText(r.reply!.body);
                            }}
                            style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                          >
                            <Icon name="pencil-outline" size={14} color={C.secondary} />
                            <AppText variant="label" color={C.secondary}>
                              Editar
                            </AppText>
                          </Pressable>
                          <Pressable
                            onPress={() => confirmDeleteReply(r.id)}
                            disabled={deleteReply.isPending}
                            style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                          >
                            <Icon name="delete-outline" size={14} color={C.error} />
                            <AppText variant="label" color={C.error}>
                              Eliminar
                            </AppText>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  ) : isOwnerHere ? (
                    <Pressable
                      onPress={() => { setReplyingId(r.id); setReplyText(""); }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
                    >
                      <Icon name="reply" size={15} color={C.secondary} />
                      <AppText variant="bodyStrong" color={C.secondary} style={{ fontSize: 14 }}>Responder</AppText>
                    </Pressable>
                  ) : null}

                  {/* Útil + Reportar */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    {isMine ? (
                      <AppText variant="label" color={C.outline}>
                        {r.helpful_count > 0
                          ? `${r.helpful_count} ${
                              r.helpful_count === 1
                                ? "persona la encontró útil"
                                : "personas la encontraron útil"
                            }`
                          : ""}
                      </AppText>
                    ) : (
                      <Pressable
                        onPress={() => {
                          impact("light");
                          toggleHelpful.mutate({
                            reviewId: r.id,
                            marked: r.viewer_marked_helpful,
                          });
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 7,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 99,
                          borderWidth: 2,
                          borderColor: C.border,
                          backgroundColor: r.viewer_marked_helpful
                            ? C.secondaryContainer
                            : C.surface,
                          ...(r.viewer_marked_helpful ? shadow.sm : null),
                        }}
                      >
                        <Icon
                          name="thumb-up"
                          size={16}
                          color={r.viewer_marked_helpful ? C.secondary : C.outline}
                          fill={r.viewer_marked_helpful ? C.secondary : undefined}
                        />
                        <AppText
                          variant="label"
                          color={r.viewer_marked_helpful ? C.secondary : C.onSurfaceVariant}
                        >
                          {r.viewer_marked_helpful ? "Te pareció útil" : "Marcar como útil"}
                          {r.helpful_count > 0 ? ` · ${r.helpful_count}` : ""}
                        </AppText>
                      </Pressable>
                    )}

                    {!isMine && !!myProfileQ.data && (
                      <Pressable
                        onPress={() => reportSheetRef.current?.present(r.id)}
                        hitSlop={8}
                        style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                      >
                        <Icon name="flag-outline" size={13} color={C.outline} />
                        <AppText variant="caption" color={C.outline}>
                          Reportar
                        </AppText>
                      </Pressable>
                    )}
                  </View>
                </View>
                );
              })
            )}
          </View>

          {!isOwnerHere && !!myProfileQ.data && (
            <Pressable
              onPress={() => restaurantReportSheetRef.current?.present(restaurant.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 8,
              }}
            >
              <Icon name="flag-outline" size={13} color={C.outline} />
              <AppText variant="caption" color={C.outline}>
                Reportar este local
              </AppText>
            </Pressable>
          )}
        </View>
      </Animated.ScrollView>

      {/* ── Header animado ── */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: headerBg,
          borderBottomWidth: headerBorder,
          borderBottomColor: C.outlineVariant,
        }}
      >
        {/* Título centrado sobre todo el ancho, aparece al scrollear */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 64,
            right: 96,
            top: insets.top,
            bottom: 8,
            alignItems: "center",
            justifyContent: "center",
            opacity: titleOpacity,
          }}
        >
          <AppText
            variant="heading"
            numberOfLines={1}
            style={{ fontSize: 18, lineHeight: 23 }}
          >
            {restaurant.name}
          </AppText>
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={{
            backgroundColor: btnBg,
            borderRadius: 20,
            borderWidth: btnBorder,
            borderColor: C.border,
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
            }}
          >
            <Icon name="arrow-left" size={22} color={C.onSurface} />
          </Pressable>
        </Animated.View>

        {/* Acciones derechas */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {!isOwnerHere && (
            <Animated.View
              style={{
                backgroundColor: btnBg,
                borderRadius: 20,
                borderWidth: btnBorder,
                borderColor: C.border,
              }}
            >
              <Pressable
                onPress={onToggleSave}
                disabled={toggleFav.isPending}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name={saved ? "heart" : "heart-outline"}
                  size={20}
                  color={saved ? C.primary : C.onSurface}
                  fill={saved ? C.primary : undefined}
                />
              </Pressable>
            </Animated.View>
          )}

          <Animated.View
            style={{
              backgroundColor: btnBg,
              borderRadius: 20,
              borderWidth: btnBorder,
              borderColor: C.border,
            }}
          >
            <Pressable
              onPress={onShare}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name="share-variant-outline"
                size={20}
                color={C.onSurface}
              />
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>

      {/* ── Review Sheet ── */}
      <ReviewSheet
        ref={reviewSheetRef}
        restaurantName={restaurant.name}
        editing={editingReview}
        submitting={submitReview.isPending || updateReview.isPending}
        errorMessage={
          submitReview.isError || updateReview.isError
            ? "No se pudo guardar. ¿Iniciaste sesión?"
            : null
        }
        onSubmit={handleSubmit}
      />

      {/* ── Report Sheets ── */}
      <ReportSheet
        ref={reportSheetRef}
        title="Reportar reseña"
        subtitle="Cuéntanos qué pasa con esta reseña. Un moderador la revisará."
        reasons={REPORT_REASONS}
        submitting={reportReview.isPending}
        onSubmit={handleReport}
      />
      <ReportSheet
        ref={restaurantReportSheetRef}
        title="Reportar local"
        subtitle="¿Algo no cuadra con este local? Un moderador lo revisará."
        reasons={RESTAURANT_REPORT_REASONS}
        submitting={reportRestaurant.isPending}
        onSubmit={handleReportRestaurant}
      />
    </View>
  );
}
