import { CategoryPickerSheet, type CategoryPickerHandle } from "@/components/community/CategoryPickerSheet";
import {
  RestaurantPickerSheet,
  type PickedRestaurant,
  type RestaurantPickerHandle,
  type SuggestedPlace,
} from "@/components/community/RestaurantPickerSheet";
import { AppText } from "@/components/ui/AppText";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { clearDraft, loadDraft, saveDraft } from "@/lib/community/draft";
import { CUSTOMER_TOPICS, errorMessage, topicLabel, type TopicKey } from "@/lib/community/topics";
import { impact, notify } from "@/lib/haptics";
import { useCategories } from "@/lib/queries/categories";
import { errorCode, useCreatePost } from "@/lib/queries/community";
import { useMyProfile } from "@/lib/queries/me";
import { useMyRestaurant } from "@/lib/queries/owner";
import { capWidth, useIsTablet } from "@/lib/responsive";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAX_BODY = 500;
const MAX_PHOTOS = 4;

/** Lo que sugiere el campo de texto según el tema. */
const TOPIC_PROMPTS: Partial<Record<TopicKey, string>> = {
  recomiendame: "¿Qué estás buscando? Ej.: ¿dónde venden buen mondongo por Barrio Obrero?",
  locales_nuevos: "¿Qué local descubriste? Cuéntanos qué probaste y dónde queda.",
  recetas: "Comparte tu receta: ingredientes, pasos y el truco de la casa.",
  antojos: "¿Qué comiste? ¿Qué se te antoja hoy?",
};

const TOPIC_META: Partial<Record<TopicKey, { icon: string; hint: string }>> = {
  recomiendame: { icon: "comment-question-outline", hint: "Pide dónde comer" },
  locales_nuevos: { icon: "storefront-outline", hint: "Uno que descubriste" },
  recetas: { icon: "chef-hat", hint: "Para hacer en casa" },
  antojos: { icon: "food", hint: "Lo que se te antoja" },
};

export default function NewPostScreen() {
  const { C, shadow } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
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
  const pickedCategories = categoryIds
    .map((cid) => categories.find((c) => c.id === cid))
    .filter((c): c is NonNullable<typeof c> => !!c);

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
  const publishOn = canPublish || createPost.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Cabecera: cerrar · título · Publicar. Respeta la barra de estado. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          paddingHorizontal: 16,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          disabled={createPost.isPending}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: C.outlineVariant,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="close" size={20} color={C.onSurface} />
        </Pressable>
        <AppText variant="subtitle">{asRestaurantId ? "Novedad del local" : "Nuevo post"}</AppText>
        <Pressable
          onPress={publish}
          disabled={!canPublish}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPublish, busy: createPost.isPending }}
          style={{
            minHeight: 44,
            minWidth: 104,
            paddingHorizontal: 18,
            borderRadius: 99,
            backgroundColor: publishOn ? C.primary : C.surfaceContainerHigh,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
            ...(canPublish ? shadow.primary : {}),
          }}
        >
          {createPost.isPending && <ActivityIndicator size="small" color="#fff" />}
          <AppText variant="label" color={publishOn ? "#fff" : C.outline}>
            {publishLabel}
          </AppText>
        </Pressable>
      </View>

      {/* Sin KeyboardAvoidingView: el teclado solo agrega espacio abajo para
          poder desplazarse; la pantalla no salta hacia arriba al abrirlo. */}
      <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: insets.bottom + 32,
            gap: 20,
            ...capWidth(isTablet, 640),
          }}
        >
          {/* ¿De qué quieres hablar? */}
          {asRestaurantId ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 14,
                borderRadius: 18,
                backgroundColor: C.primaryFixed,
              }}
            >
              <Icon name="storefront" size={22} color={C.primary} />
              <AppText variant="bodySm" style={{ flex: 1 }}>
                Sale como novedad de tu local. Puedes publicar una cada 24 horas.
              </AppText>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <AppText variant="overline" color={C.onSurfaceVariant}>
                ¿De qué quieres hablar?
              </AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {CUSTOMER_TOPICS.map((t) => (
                  <TopicTile
                    key={t.key}
                    topicKey={t.key}
                    label={t.label}
                    active={topic === t.key}
                    onPress={() => {
                      impact("light");
                      setTopic(t.key);
                    }}
                  />
                ))}
              </View>
            </View>
          )}

          {/* La tarjeta del post */}
          <View
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: C.outlineVariant,
              backgroundColor: C.surface,
              ...shadow.sm,
            }}
          >
            <View style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar
                  uri={asRestaurantId ? myRestaurant?.logo_url : me?.avatar_url}
                  size={36}
                  icon={asRestaurantId ? "storefront-outline" : "account"}
                  bordered={false}
                />
                <View style={{ flex: 1 }}>
                  <AppText variant="label" numberOfLines={1}>
                    {asRestaurantId ? (myRestaurant?.name ?? "Tu local") : (me?.full_name ?? me?.username ?? "Tú")}
                  </AppText>
                  <AppText variant="caption" color={C.onSurfaceVariant}>
                    {topicLabel(topic)}
                  </AppText>
                </View>
              </View>

              <TextInput
                value={body}
                onChangeText={(t) => setBody(t.slice(0, MAX_BODY))}
                placeholder={
                  asRestaurantId
                    ? "Plato del día, una promo, horario especial…"
                    : (TOPIC_PROMPTS[topic] ?? "Cuéntanos…")
                }
                placeholderTextColor={C.outline}
                multiline
                autoFocus
                scrollEnabled={false}
                accessibilityLabel="Texto del post"
                style={{
                  minHeight: 110,
                  color: C.onSurface,
                  fontFamily: "PlusJakartaSans_500Medium",
                  fontSize: 17,
                  lineHeight: 25,
                  textAlignVertical: "top",
                  padding: 0,
                }}
              />

              {photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {photos.map((uri) => (
                    <View key={uri}>
                      <Image source={{ uri }} style={{ width: 104, height: 104, borderRadius: 16 }} contentFit="cover" />
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
                </ScrollView>
              )}

              {/* Etiquetas puestas */}
              {(restaurant || suggested || pickedCategories.length > 0) && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {restaurant && (
                    <TagPill icon="storefront" label={restaurant.name} strong onRemove={() => setRestaurant(null)} />
                  )}
                  {suggested && (
                    <TagPill
                      icon="map-marker-outline"
                      label={`${suggested.name} · no está en El Point`}
                      onRemove={() => setSuggested(null)}
                    />
                  )}
                  {pickedCategories.map((c) => (
                    <TagPill
                      key={c.id}
                      icon={c.icon}
                      label={c.label}
                      onRemove={() => setCategoryIds((ids) => ids.filter((x) => x !== c.id))}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Barra de herramientas */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: C.outlineVariant,
              }}
            >
              <ToolButton
                icon="image-plus"
                label={photos.length ? `${photos.length}/${MAX_PHOTOS}` : "Foto"}
                active={photos.length > 0}
                disabled={photos.length >= MAX_PHOTOS || createPost.isPending}
                onPress={addPhotos}
              />
              {!asRestaurantId && (
                <ToolButton
                  icon="storefront-outline"
                  label="Local"
                  active={!!restaurant || !!suggested}
                  onPress={() => restaurantSheet.current?.present()}
                />
              )}
              <ToolButton
                icon="silverware-fork-knife"
                label="Comida"
                active={categoryIds.length > 0}
                onPress={() => categorySheet.current?.present(categoryIds)}
              />
              <View style={{ flex: 1 }} />
              <AppText variant="caption" color={body.length > MAX_BODY - 40 ? C.primary : C.outline}>
                {body.length}/{MAX_BODY}
              </AppText>
            </View>
          </View>

          {!hasTag && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
              <Icon name="tag-outline" size={16} color={C.onSurfaceVariant} />
              <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ flex: 1 }}>
                Agrega un local o una comida para que llegue a quien le interesa.
              </AppText>
            </View>
          )}
        </ScrollView>

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
      <CategoryPickerSheet
        ref={categorySheet}
        title="¿Qué comida?"
        hint="Elige hasta 2. Así lo encuentra quien busca esa comida."
        onDone={setCategoryIds}
      />
    </View>
  );
}

function TopicTile({
  topicKey,
  label,
  active,
  onPress,
}: {
  topicKey: TopicKey;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { C } = useTheme();
  const meta = TOPIC_META[topicKey];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={`${label}: ${meta?.hint ?? ""}`}
      style={{
        flexGrow: 1,
        flexBasis: "45%",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
        borderRadius: 18,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? C.primary : C.outlineVariant,
        backgroundColor: active ? C.primaryFixed : C.surface,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: active ? C.primary : C.surfaceContainer,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={meta?.icon ?? "circle"} size={19} color={active ? "#fff" : C.onSurfaceVariant} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label" color={active ? C.primary : C.onSurface} numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="caption" color={C.onSurfaceVariant} numberOfLines={1}>
          {meta?.hint}
        </AppText>
      </View>
    </Pressable>
  );
}

function ToolButton({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { C } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 40,
        paddingHorizontal: 12,
        borderRadius: 99,
        backgroundColor: active ? C.primaryFixed : C.surfaceContainerLow,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon name={icon} size={18} color={active ? C.primary : C.onSurfaceVariant} />
      <AppText variant="label" color={active ? C.primary : C.onSurfaceVariant}>
        {label}
      </AppText>
    </Pressable>
  );
}

function TagPill({
  icon,
  label,
  strong = false,
  onRemove,
}: {
  icon: string;
  label: string;
  strong?: boolean;
  onRemove: () => void;
}) {
  const { C } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingLeft: 10,
        paddingRight: 6,
        paddingVertical: 6,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: strong ? C.primary : C.outlineVariant,
        maxWidth: "100%",
      }}
    >
      <Icon name={icon} size={15} color={strong ? C.primary : C.onSurfaceVariant} />
      <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </AppText>
      <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Quitar ${label}`}>
        <Icon name="close-circle" size={17} color={C.outline} />
      </Pressable>
    </View>
  );
}
