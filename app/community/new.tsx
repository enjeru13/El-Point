import { CategoryPickerSheet, type CategoryPickerHandle } from "@/components/community/CategoryPickerSheet";
import {
  RestaurantPickerSheet,
  type PickedRestaurant,
  type RestaurantPickerHandle,
  type SuggestedPlace,
} from "@/components/community/RestaurantPickerSheet";
import { AppText } from "@/components/ui/AppText";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { ChipRow } from "@/components/ui/ChipRow";
import { Icon } from "@/components/ui/Icon";
import { clearDraft, loadDraft, saveDraft } from "@/lib/community/draft";
import { CUSTOMER_TOPICS, errorMessage, type TopicKey } from "@/lib/community/topics";
import { notify } from "@/lib/haptics";
import { useCategories } from "@/lib/queries/categories";
import { errorCode, useCreatePost } from "@/lib/queries/community";
import { useMyProfile } from "@/lib/queries/me";
import { useMyRestaurant } from "@/lib/queries/owner";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAX_BODY = 500;
const MAX_PHOTOS = 4;

export default function NewPostScreen() {
  const { C } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { asRestaurant } = useLocalSearchParams<{ asRestaurant?: string }>();
  const asRestaurantId = asRestaurant || null;
  const { data: me } = useMyProfile();
  const { data: myRestaurant } = useMyRestaurant();
  const { data: categories = [] } = useCategories();
  const createPost = useCreatePost();

  // El id del post se fija al abrir: un doble toque o un reintento no duplica.
  const clientId = useRef(Crypto.randomUUID()).current;
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState<TopicKey>(asRestaurantId ? "novedades" : "antojos");
  const [photos, setPhotos] = useState<string[]>([]);
  const [restaurant, setRestaurant] = useState<PickedRestaurant | null>(null);
  const [suggested, setSuggested] = useState<SuggestedPlace | null>(null);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [uploaded, setUploaded] = useState<{ done: number; total: number } | null>(null);
  const restaurantSheet = useRef<RestaurantPickerHandle>(null);
  const categorySheet = useRef<CategoryPickerHandle>(null);

  // Recuperar el borrador al abrir y guardarlo mientras escribes.
  useEffect(() => {
    loadDraft(asRestaurantId).then((d) => {
      if (d) {
        setBody(d.body);
        if (!asRestaurantId) setTopic((d.topic as TopicKey) || "antojos");
        setPhotos(d.photos);
        setRestaurant(d.restaurant);
        setSuggested(d.suggested);
        setCategoryIds(d.categoryIds);
      }
      setLoaded(true);
    });
  }, [asRestaurantId]);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(
      () => saveDraft({ body, topic, photos, restaurant, suggested, categoryIds }, asRestaurantId),
      400,
    );
    return () => clearTimeout(t);
  }, [loaded, body, topic, photos, restaurant, suggested, categoryIds, asRestaurantId]);

  const hasTag = !!asRestaurantId || !!restaurant || !!suggested || categoryIds.length > 0;
  const canPublish = body.trim().length > 0 && hasTag && !createPost.isPending;
  const categoryText = useMemo(
    () =>
      categoryIds
        .map((id) => categories.find((c) => c.id === id)?.label)
        .filter(Boolean)
        .map((l) => `#${l!.toLowerCase()}`)
        .join("  "),
    [categoryIds, categories],
  );

  const addPhotos = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.9,
    });
    if (!r.canceled) setPhotos((p) => [...p, ...r.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
  };

  const publish = () => {
    if (!canPublish) return;
    setUploaded(photos.length ? { done: 0, total: photos.length } : null);
    createPost.mutate(
      {
        clientId,
        topic,
        body: body.trim(),
        restaurantId: asRestaurantId ? null : restaurant?.id,
        restaurantName: asRestaurantId ? myRestaurant?.name : restaurant?.name,
        suggestedName: asRestaurantId ? null : suggested?.name,
        suggestedZone: asRestaurantId ? null : suggested?.zone || null,
        categoryIds,
        asRestaurantId,
        photos,
        onPhotoUploaded: (done, total) => setUploaded({ done, total }),
      },
      {
        onSuccess: async () => {
          notify("success");
          await clearDraft(asRestaurantId);
          router.back();
        },
        onError: (e) => {
          setUploaded(null);
          notify("error");
          toast.error(errorMessage(errorCode(e)));
        },
      },
    );
  };

  const publishLabel = uploaded
    ? `Subiendo ${uploaded.done}/${uploaded.total}`
    : createPost.isPending
      ? "Publicando…"
      : "Publicar";

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <Stack.Screen options={{ presentation: "modal", gestureEnabled: !createPost.isPending }} />

      {/* Cabecera: Cancelar · Nuevo post · Publicar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: Platform.OS === "ios" ? 14 : insets.top + 10,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: C.outlineVariant,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          disabled={createPost.isPending}
          hitSlop={8}
          accessibilityRole="button"
          style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }}
        >
          <AppText variant="body" color={C.onSurfaceVariant}>
            Cancelar
          </AppText>
        </Pressable>
        <AppText variant="subtitle">{asRestaurantId ? "Novedad del local" : "Nuevo post"}</AppText>
        <Pressable
          onPress={publish}
          disabled={!canPublish}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPublish, busy: createPost.isPending }}
          style={{
            minHeight: 40,
            minWidth: 96,
            paddingHorizontal: 16,
            borderRadius: 99,
            backgroundColor: canPublish || createPost.isPending ? C.primary : C.surfaceContainerHigh,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
          }}
        >
          {createPost.isPending && <ActivityIndicator size="small" color="#fff" />}
          <AppText variant="label" color={canPublish || createPost.isPending ? "#fff" : C.outline}>
            {publishLabel}
          </AppText>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 18 }}
        >
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Avatar
              uri={asRestaurantId ? myRestaurant?.logo_url : me?.avatar_url}
              size={40}
              icon={asRestaurantId ? "storefront-outline" : "account"}
              bordered={false}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">
                {asRestaurantId ? (myRestaurant?.name ?? "Tu local") : (me?.full_name ?? me?.username ?? "Tú")}
              </AppText>
              <TextInput
                value={body}
                onChangeText={(t) => setBody(t.slice(0, MAX_BODY))}
                placeholder={
                  asRestaurantId
                    ? "Plato del día, una promo, horario especial…"
                    : "¿Qué comiste? ¿Qué se te antoja? ¿Qué recomiendas?"
                }
                placeholderTextColor={C.outline}
                multiline
                autoFocus
                scrollEnabled={false}
                accessibilityLabel="Texto del post"
                style={{
                  minHeight: 80,
                  color: C.onSurface,
                  fontFamily: "PlusJakartaSans_500Medium",
                  fontSize: 16,
                  lineHeight: 23,
                  textAlignVertical: "top",
                  padding: 0,
                }}
              />
            </View>
          </View>

          {/* Fotos */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingLeft: 52 }}>
            {photos.map((uri) => (
              <View key={uri}>
                <Image source={{ uri }} style={{ width: 96, height: 96, borderRadius: 14 }} contentFit="cover" />
                <Pressable
                  onPress={() => setPhotos((p) => p.filter((x) => x !== uri))}
                  disabled={createPost.isPending}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar foto"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="close" size={15} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Pressable
                onPress={addPhotos}
                disabled={createPost.isPending}
                accessibilityRole="button"
                accessibilityLabel="Agregar fotos"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: C.outlineVariant,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="image-plus" size={26} color={C.onSurfaceVariant} />
              </Pressable>
            )}
          </ScrollView>

          {/* Tema, local y categorías */}
          <View style={{ borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 18, overflow: "hidden" }}>
            {!asRestaurantId && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  borderBottomColor: C.outlineVariant,
                }}
              >
                <AppText variant="body" color={C.onSurfaceVariant} style={{ width: 96, paddingLeft: 16 }}>
                  Tema
                </AppText>
                <View style={{ flex: 1 }}>
                  <ChipRow padY={10} side={0} contained>
                    {CUSTOMER_TOPICS.map((t) => (
                      <Chip key={t.key} label={t.label} active={topic === t.key} onPress={() => setTopic(t.key)} flat />
                    ))}
                  </ChipRow>
                </View>
              </View>
            )}

            {!asRestaurantId && (
              <OptionRow label="Local" onPress={() => restaurantSheet.current?.present()}>
                {restaurant ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icon name="storefront" size={16} color={C.primary} />
                    <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {restaurant.name}
                    </AppText>
                  </View>
                ) : suggested ? (
                  <AppText variant="label" numberOfLines={1}>
                    {suggested.name}
                    <AppText variant="caption" color={C.onSurfaceVariant}>
                      {"  "}no está en El Point
                    </AppText>
                  </AppText>
                ) : (
                  <AppText variant="body" color={C.outline}>
                    Opcional
                  </AppText>
                )}
                {(restaurant || suggested) && (
                  <Pressable
                    onPress={() => {
                      setRestaurant(null);
                      setSuggested(null);
                    }}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar local"
                  >
                    <Icon name="close-circle" size={18} color={C.outline} />
                  </Pressable>
                )}
              </OptionRow>
            )}

            <OptionRow label="Categoría" last onPress={() => categorySheet.current?.present(categoryIds)}>
              <AppText variant="label" color={categoryText ? C.onSurface : C.outline} numberOfLines={1}>
                {categoryText || "Opcional · hasta 2"}
              </AppText>
            </OptionRow>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <AppText variant="caption" color={hasTag ? C.onSurfaceVariant : C.primary} style={{ flex: 1 }}>
              {asRestaurantId ? "Sale como novedad de tu local. Un post cada 24 horas." : "Etiqueta un local o una categoría."}
            </AppText>
            <AppText variant="caption" color={body.length > MAX_BODY - 40 ? C.primary : C.onSurfaceVariant}>
              {body.length} / {MAX_BODY}
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <RestaurantPickerSheet
        ref={restaurantSheet}
        onPick={(r) => {
          setRestaurant(r);
          setSuggested(null);
        }}
        onSuggest={(s) => {
          setSuggested(s);
          setRestaurant(null);
        }}
      />
      <CategoryPickerSheet ref={categorySheet} onDone={setCategoryIds} />
    </View>
  );
}

function OptionRow({
  label,
  last = false,
  onPress,
  children,
}: {
  label: string;
  last?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { C } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Elegir ${label.toLowerCase()}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 56,
        paddingRight: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.outlineVariant,
      }}
    >
      <AppText variant="body" color={C.onSurfaceVariant} style={{ width: 96, paddingLeft: 16 }}>
        {label}
      </AppText>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>{children}</View>
      <Icon name="chevron-right" size={18} color={C.outline} />
    </Pressable>
  );
}
