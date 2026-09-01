import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Icon } from "@/components/ui/Icon";
import { StarRow } from "@/components/ui/StarRow";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { RankBadge } from "@/components/ui/RankBadge";
import { useRestaurant } from "@/lib/queries/restaurants";
import {
  useReviews,
  useSubmitReview,
  useToggleHelpful,
  useReplyToReview,
  type Review,
} from "@/lib/queries/reviews";
import { useMyProfile } from "@/lib/queries/me";
import { isOpenNow, formatRange, DAY_LABELS_LONG } from "@/lib/hours";
import { useTheme } from "@/lib/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
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

function ReviewModal({
  visible,
  onClose,
  restaurantName,
  submitting,
  errorMessage,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  restaurantName: string;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (rating: number, body: string, photoUris: string[]) => void;
}) {
  const { C, shadow } = useTheme();
  const RATING_COLORS = [
    "",
    C.error,
    C.outline,
    C.secondary,
    C.primaryContainer,
    C.secondary,
  ];
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  async function addPhotos() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
    });
    if (r.canceled) return;
    setPhotos((prev) => [...prev, ...r.assets.map((a) => a.uri)].slice(0, 4));
  }
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setRating(0);
      setComment("");
      setPhotos([]);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.94,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const canSubmit = rating > 0 && comment.trim().length >= 10 && !submitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
    >
      {/* Backdrop — dismiss teclado primero, cerrar solo si ya estaba cerrado */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(28,27,27,0.65)",
          opacity: fadeAnim,
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            Keyboard.dismiss();
          }}
        />
      </Animated.View>

      {/* KeyboardAvoidingView empuja el panel cuando sube el teclado */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          justifyContent: "center",
          pointerEvents: "box-none",
        }}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={{
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 8,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 28,
              borderWidth: 2,
              borderColor: C.border,
              overflow: "hidden",
              ...shadow.md,
            }}
          >
            {/* Header con color primario */}
            <View
              style={{
                backgroundColor: C.primaryFixed,
                borderBottomWidth: 2,
                borderBottomColor: C.border,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ gap: 2 }}>
                <Text
                  style={{
                    color: C.onSurfaceVariant,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                    fontSize: 12,
                    letterSpacing: 1,
                  }}
                >
                  RANKEAR
                </Text>
                <Text
                  style={{
                    color: C.onSurface,
                    fontFamily: "Outfit_700Bold",
                    fontSize: 22,
                  }}
                >
                  {restaurantName}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: C.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: C.border,
                }}
              >
                <Icon name="close" size={18} color={C.onSurface} />
              </Pressable>
            </View>

            <View style={{ padding: 20, gap: 20 }}>
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
                    <Text
                      style={{
                        fontFamily: "PlusJakartaSans_700Bold",
                        fontSize: 15,
                        color: RATING_COLORS[rating],
                      }}
                    >
                      {RATING_LABELS[rating]}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      color: C.outline,
                      fontFamily: "PlusJakartaSans_400Regular",
                      fontSize: 14,
                    }}
                  >
                    ¿Cuántas estrellas le das?
                  </Text>
                )}
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: C.outlineVariant }} />

              {/* Comentario */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    color: C.onSurfaceVariant,
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 12,
                    letterSpacing: 1,
                  }}
                >
                  TU EXPERIENCIA
                </Text>
                <TextInput
                  value={comment}
                  onChangeText={(t) => setComment(t.slice(0, 500))}
                  placeholder="Cuéntale a la comunidad qué tal estuvo..."
                  placeholderTextColor={C.outline}
                  multiline
                  style={{
                    backgroundColor: C.surfaceContainerLow,
                    borderWidth: 2,
                    borderColor:
                      comment.length > 0 ? C.border : C.outlineVariant,
                    borderRadius: 16,
                    padding: 14,
                    fontFamily: "PlusJakartaSans_400Regular",
                    fontSize: 15,
                    color: C.onSurface,
                    textAlignVertical: "top",
                    minHeight: 110,
                  }}
                />
                <Text
                  style={{
                    color: comment.trim().length < 10 ? C.error : C.outline,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                    fontSize: 12,
                    textAlign: "right",
                  }}
                >
                  {comment.length < 10
                    ? `Mínimo 10 caracteres · ${comment.length} / 500`
                    : `${comment.length} / 500`}
                </Text>
              </View>

              {/* Fotos */}
              <View style={{ gap: 8 }}>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: "PlusJakartaSans_700Bold", fontSize: 12, letterSpacing: 1 }}>
                  FOTOS (OPCIONAL)
                </Text>
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
                <Text
                  style={{
                    color: C.error,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                    fontSize: 13,
                  }}
                >
                  {errorMessage}
                </Text>
              )}

              {/* Submit */}
              <Button
                label={submitting ? "Publicando…" : "Publicar Rank"}
                onPress={() => onSubmit(rating, comment.trim(), photos)}
                disabled={!(rating > 0 && comment.trim().length >= 10)}
                loading={submitting}
                icon="fire"
              />
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function RestaurantProfileScreen() {
  const { C, shadow } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const restaurantQ = useRestaurant(id);
  const reviewsQ = useReviews(id);
  const submitReview = useSubmitReview(id);
  const toggleHelpful = useToggleHelpful(id);
  const replyMut = useReplyToReview(id);
  const myProfileQ = useMyProfile();

  const [saved, setSaved] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [hoursOpen, setHoursOpen] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

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
      <View
        style={{
          flex: 1,
          backgroundColor: C.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={C.primary} />
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
        <Text
          style={{
            color: C.onSurface,
            fontFamily: "Outfit_700Bold",
            fontSize: 18,
            textAlign: "center",
          }}
        >
          No pudimos cargar este lugar
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button label="Reintentar" onPress={() => restaurantQ.refetch()} size="sm" fullWidth={false} />
          <Button label="Volver" onPress={() => router.back()} variant="secondary" size="sm" fullWidth={false} />
        </View>
      </View>
    );
  }

  const restaurant = restaurantQ.data;
  const reviews = reviewsQ.data ?? [];
  const isOwnerHere = !!myProfileQ.data?.id && myProfileQ.data.id === restaurant.owner_id;
  const heroIcon = restaurant.categories[0]?.icon ?? "silverware-fork-knife";
  const priceStr = priceLabel(restaurant.price_level);
  const dist = [5, 4, 3, 2, 1].map(
    (s) => reviews.filter((r) => r.rating === s).length,
  );
  const totalRated = reviews.length || restaurant.rating_count;

  function handleSubmit(rating: number, body: string, photoUris: string[]) {
    submitReview.mutate(
      { rating, body, photoUris },
      { onSuccess: () => setReviewModalOpen(false) },
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

          {/* Info overlay */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              gap: 8,
              backgroundColor: "rgba(28,27,27,0.6)",
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
                    <Text
                      style={{
                        color: C.onSurface,
                        fontFamily: "PlusJakartaSans_700Bold",
                        fontSize: 15,
                      }}
                    >
                      {c.label.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Text
              style={{
                color: "#fff",
                fontFamily: "Outfit_800ExtraBold",
                fontSize: 36,
                lineHeight: 40,
              }}
            >
              {restaurant.name}
            </Text>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Icon name="star" size={16} color={C.secondaryContainer} />
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 15,
                  }}
                >
                  {restaurant.rating_count > 0
                    ? `${restaurant.rating_avg} (${restaurant.rating_count})`
                    : "Sin ranks aún"}
                </Text>
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
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.85)",
                      fontFamily: "PlusJakartaSans_400Regular",
                      fontSize: 15,
                    }}
                  >
                    {[priceStr].filter(Boolean).join(" • ") || "Ver ubicación"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Contenido ── */}
        <View style={{ padding: 16, gap: 20 }}>
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
                <Text
                  style={{
                    color: C.onSurface,
                    fontFamily: "Outfit_700Bold",
                    fontSize: 13,
                    letterSpacing: 0.5,
                  }}
                >
                  PROMOS
                </Text>
                <Text
                  style={{
                    color: C.onSurface,
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 15,
                  }}
                >
                  {restaurant.promo_text}
                </Text>
              </View>
            </View>
          )}

          {/* ── Acciones ── */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              label="Rankear"
              onPress={() => setReviewModalOpen(true)}
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
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: os.open ? "rgba(34,197,94,0.15)" : "rgba(186,26,26,0.12)", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="clock-outline" size={18} color={os.open ? "#16a34a" : C.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: os.open ? "#16a34a" : C.error, fontFamily: "PlusJakartaSans_700Bold", fontSize: 15 }}>
                        {os.open ? "Abierto ahora" : "Cerrado"}
                      </Text>
                      <Text style={{ color: C.onSurfaceVariant, fontFamily: "PlusJakartaSans_400Regular", fontSize: 14 }}>
                        {os.label.replace(/^(Abierto|Cerrado)( ·)? ?/, "")}
                      </Text>
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
                            <Text style={{ color: today ? C.primary : C.onSurfaceVariant, fontFamily: today ? "PlusJakartaSans_700Bold" : "PlusJakartaSans_600SemiBold", fontSize: 13 }}>
                              {DAY_LABELS_LONG[dow]}
                            </Text>
                            <Text style={{ color: today ? C.primary : C.onSurfaceVariant, fontFamily: today ? "PlusJakartaSans_700Bold" : "PlusJakartaSans_400Regular", fontSize: 13 }}>
                              {formatRange(d)}
                            </Text>
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
                  <Text
                    style={{
                      color: C.onSurface,
                      fontFamily: "PlusJakartaSans_700Bold",
                      fontSize: 15,
                    }}
                  >
                    {restaurant.address}
                  </Text>
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
                <Text
                  style={{
                    flex: 1,
                    color: C.secondary,
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 15,
                  }}
                >
                  {restaurant.phone}
                </Text>
                <Icon name="chevron-right" size={18} color={C.outline} />
              </Pressable>
            )}

            {/* WhatsApp */}
            {restaurant.whatsapp && (
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `https://wa.me/${restaurant.whatsapp!.replace(/[^\d]/g, "")}`,
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
                    backgroundColor: C.secondaryContainer,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="whatsapp" size={18} color={C.secondary} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: C.secondary,
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 15,
                  }}
                >
                  {restaurant.whatsapp}
                </Text>
                <Icon name="chevron-right" size={18} color={C.outline} />
              </Pressable>
            )}

            {/* Instagram */}
            {restaurant.instagram && (
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `https://instagram.com/${restaurant.instagram!.replace(/^@/, "")}`,
                  )
                }
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
                <Text
                  style={{
                    flex: 1,
                    color: C.tertiary,
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 15,
                  }}
                >
                  {restaurant.instagram.startsWith("@")
                    ? restaurant.instagram
                    : `@${restaurant.instagram}`}
                </Text>
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
                <Text
                  style={{
                    color: C.onSurface,
                    fontFamily: "Outfit_700Bold",
                    fontSize: 17,
                  }}
                >
                  Ver menú completo
                </Text>
                <Text
                  style={{
                    color: C.onSurfaceVariant,
                    fontFamily: "PlusJakartaSans_400Regular",
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  Abre el menú en PDF
                </Text>
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
                <Text
                  style={{
                    color: C.onSurface,
                    fontFamily: "Outfit_700Bold",
                    fontSize: 18,
                  }}
                >
                  Nuestra historia
                </Text>
              </View>
              <Text
                style={{
                  color: C.onSurface,
                  fontFamily: "PlusJakartaSans_400Regular",
                  fontSize: 15,
                  lineHeight: 22,
                  opacity: 0.85,
                }}
              >
                {restaurant.description}
              </Text>
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
                <Text
                  style={{
                    color: C.onSurface,
                    fontFamily: "Outfit_700Bold",
                    fontSize: 20,
                  }}
                >
                  Comunidad
                </Text>
              </View>
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
                <Text
                  style={{
                    color: C.primary,
                    fontFamily: "Outfit_800ExtraBold",
                    fontSize: 48,
                    lineHeight: 52,
                  }}
                >
                  {restaurant.rating_count > 0 ? restaurant.rating_avg : "–"}
                </Text>
                <StarRow rating={Math.round(restaurant.rating_avg)} size={14} />
                <Text
                  style={{
                    color: C.outline,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                    fontSize: 15,
                  }}
                >
                  {restaurant.rating_count}{" "}
                  {restaurant.rating_count === 1 ? "rank" : "ranks"}
                </Text>
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
                      <Text
                        style={{
                          color: C.outline,
                          fontFamily: "PlusJakartaSans_600SemiBold",
                          fontSize: 15,
                          width: 8,
                        }}
                      >
                        {star}
                      </Text>
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

            {/* CTA nueva reseña */}
            <Pressable
              onPress={() => setReviewModalOpen(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 14,
                borderRadius: 16,
                backgroundColor: C.surfaceContainerLow,
                borderWidth: 2,
                borderColor: C.outlineVariant,
                borderStyle: "dashed",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: C.primaryFixed,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: C.border,
                }}
              >
                <Icon name="account" size={20} color={C.primary} />
              </View>
              <Text
                style={{
                  flex: 1,
                  color: C.outline,
                  fontFamily: "PlusJakartaSans_400Regular",
                  fontSize: 15,
                }}
              >
                ¿Qué tal estuvo? Deja tu rank...
              </Text>
              <Icon name="fire" size={20} color={C.primary} />
            </Pressable>

            {/* Estado carga / vacío / lista */}
            {reviewsQ.isLoading ? (
              <View style={{ paddingVertical: 32, alignItems: "center" }}>
                <ActivityIndicator color={C.primary} />
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
                <Text
                  style={{
                    color: C.outline,
                    fontFamily: "PlusJakartaSans_400Regular",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  Todavía nadie rankea este lugar. Sé el primero.
                </Text>
              </View>
            ) : (
              reviews.map((r) => (
                <View
                  key={r.id}
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
                      <Text
                        style={{
                          color: C.onSurface,
                          fontFamily: "PlusJakartaSans_700Bold",
                          fontSize: 15,
                        }}
                      >
                        {authorName(r.author)}
                      </Text>
                      <View style={{ marginTop: 3 }}>
                        <RankBadge level={r.author?.level ?? 1} />
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <StarRow rating={r.rating} size={12} />
                      <Text
                        style={{
                          color: C.outline,
                          fontFamily: "PlusJakartaSans_600SemiBold",
                          fontSize: 15,
                        }}
                      >
                        {timeAgo(r.created_at)}
                      </Text>
                    </View>
                  </View>

                  {/* Comment */}
                  <Text
                    style={{
                      color: C.onSurfaceVariant,
                      fontFamily: "PlusJakartaSans_400Regular",
                      fontSize: 15,
                      lineHeight: 21,
                    }}
                  >
                    {r.body}
                  </Text>

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
                  {r.reply ? (
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
                      <Text style={{ color: C.secondary, fontFamily: "PlusJakartaSans_700Bold", fontSize: 12, letterSpacing: 0.5 }}>
                        RESPUESTA DEL LOCAL · {timeAgo(r.reply.created_at)}
                      </Text>
                      <Text style={{ color: C.onSurface, fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, lineHeight: 20 }}>
                        {r.reply.body}
                      </Text>
                    </View>
                  ) : isOwnerHere && replyingId === r.id ? (
                    <View style={{ gap: 8 }}>
                      <TextInput
                        value={replyText}
                        onChangeText={(t) => setReplyText(t.slice(0, 500))}
                        placeholder="Responde a este cliente…"
                        placeholderTextColor={C.outline}
                        multiline
                        style={{
                          backgroundColor: C.surfaceContainerLow,
                          borderWidth: 2, borderColor: C.outlineVariant, borderRadius: 12,
                          padding: 12, minHeight: 70, textAlignVertical: "top",
                          fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, color: C.onSurface,
                        }}
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Button
                          label="Cancelar"
                          onPress={() => { setReplyingId(null); setReplyText(""); }}
                          variant="ghost"
                          size="sm"
                          fullWidth={false}
                        />
                        <Button
                          label="Enviar"
                          onPress={() =>
                            replyMut.mutate(
                              { reviewId: r.id, body: replyText },
                              { onSuccess: () => { setReplyingId(null); setReplyText(""); } },
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
                  ) : isOwnerHere ? (
                    <Pressable
                      onPress={() => { setReplyingId(r.id); setReplyText(""); }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
                    >
                      <Icon name="reply" size={15} color={C.secondary} />
                      <Text style={{ color: C.secondary, fontFamily: "PlusJakartaSans_700Bold", fontSize: 14 }}>Responder</Text>
                    </Pressable>
                  ) : null}

                  {/* Helpful */}
                  <Pressable
                    onPress={() =>
                      toggleHelpful.mutate({
                        reviewId: r.id,
                        marked: r.viewer_marked_helpful,
                      })
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Icon
                      name={
                        r.viewer_marked_helpful
                          ? "thumb-up"
                          : "thumb-up-outline"
                      }
                      size={16}
                      color={r.viewer_marked_helpful ? C.secondary : C.outline}
                    />
                    <Text
                      style={{
                        color: r.viewer_marked_helpful
                          ? C.secondary
                          : C.outline,
                        fontFamily: "PlusJakartaSans_600SemiBold",
                        fontSize: 15,
                      }}
                    >
                      {r.helpful_count} útil
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
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
          backgroundColor: headerBg,
          borderBottomWidth: headerBorder,
          borderBottomColor: C.outlineVariant,
        }}
      >
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

        {/* Título aparece al scrollear */}
        <Animated.Text
          style={{
            flex: 1,
            textAlign: "center",
            fontFamily: "Outfit_700Bold",
            fontSize: 18,
            color: C.onSurface,
            opacity: titleOpacity,
            marginHorizontal: 8,
          }}
          numberOfLines={1}
        >
          {restaurant.name}
        </Animated.Text>

        {/* Acciones derechas */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Animated.View
            style={{
              backgroundColor: btnBg,
              borderRadius: 20,
              borderWidth: btnBorder,
              borderColor: C.border,
            }}
          >
            <Pressable
              onPress={() => setSaved((s) => !s)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name={saved ? "star" : "star-outline"}
                size={20}
                color={saved ? C.secondary : C.onSurface}
              />
            </Pressable>
          </Animated.View>

          <Animated.View
            style={{
              backgroundColor: btnBg,
              borderRadius: 20,
              borderWidth: btnBorder,
              borderColor: C.border,
            }}
          >
            <Pressable
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

      {/* ── Review Modal ── */}
      <ReviewModal
        visible={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        restaurantName={restaurant.name}
        submitting={submitReview.isPending}
        errorMessage={
          submitReview.isError
            ? "No se pudo publicar. ¿Iniciaste sesión?"
            : null
        }
        onSubmit={handleSubmit}
      />
    </View>
  );
}
