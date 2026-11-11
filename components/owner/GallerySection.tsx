import { useScrollLock } from "@/components/owner/SectionShell";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { impact } from "@/lib/haptics";
import { GALLERY_LIMIT, useGallery, useGalleryMutations, type GalleryPhoto } from "@/lib/queries/gallery";
import { MENU_IMAGES_LIMIT, useMenuImages, useMenuImageMutations } from "@/lib/queries/menuImages";
import type { OwnerRestaurant } from "@/lib/queries/owner";
import type { UseMutationResult } from "@tanstack/react-query";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

const GAP = 10;
const COLS = 3;

type CellProps = {
  photo: GalleryPhoto;
  initialIndex: number;
  tile: number;
  count: number;
  order: SharedValue<string[]>;
  activeId: SharedValue<string | null>;
  onCommit: (ids: string[]) => void;
  onDelete: (photo: GalleryPhoto) => void;
  onLock: (locked: boolean) => void;
  /** Texto de la insignia de la primera foto; sin texto, no se muestra. */
  firstBadge?: string;
};

/** Una foto de la cuadrícula: se levanta con un toque largo y se arrastra a su nuevo lugar. */
function Cell({ photo, initialIndex, tile, count, order, activeId, onCommit, onDelete, onLock, firstBadge }: CellProps) {
  const { C } = useTheme();
  const [index, setIndex] = useState(initialIndex);
  const mounted = useSharedValue(false);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const step = tile + GAP;

  useEffect(() => {
    mounted.value = true;
  }, [mounted]);

  // El número de la foto sigue su posición actual mientras se arrastra.
  useAnimatedReaction(
    () => order.value.indexOf(photo.id),
    (i, prev) => {
      if (i !== prev && i >= 0) runOnJS(setIndex)(i);
    },
  );

  const style = useAnimatedStyle(() => {
    // Antes de que `order` se llene (primer cuadro), la foto va en su lugar de origen: sin saltos.
    const raw = order.value.indexOf(photo.id);
    const i = raw >= 0 ? raw : initialIndex;
    const x = (i % COLS) * step;
    const y = Math.floor(i / COLS) * step;
    if (activeId.value === photo.id) {
      return {
        transform: [{ translateX: dragX.value }, { translateY: dragY.value }, { scale: 1.06 }],
        zIndex: 10,
        shadowOpacity: 0.3,
        elevation: 10,
      };
    }
    return {
      transform: [
        { translateX: mounted.value ? withTiming(x, { duration: 180 }) : x },
        { translateY: mounted.value ? withTiming(y, { duration: 180 }) : y },
        { scale: 1 },
      ],
      zIndex: 0,
      shadowOpacity: 0,
      elevation: 0,
    };
  });

  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      const i = order.value.indexOf(photo.id);
      startX.value = (i % COLS) * step;
      startY.value = Math.floor(i / COLS) * step;
      dragX.value = startX.value;
      dragY.value = startY.value;
      activeId.value = photo.id;
      runOnJS(onLock)(true);
      runOnJS(impact)("medium");
    })
    .onUpdate((e) => {
      dragX.value = startX.value + e.translationX;
      dragY.value = startY.value + e.translationY;
      const col = Math.max(0, Math.min(COLS - 1, Math.floor((dragX.value + tile / 2) / step)));
      const row = Math.max(0, Math.floor((dragY.value + tile / 2) / step));
      const target = Math.min(count - 1, row * COLS + col);
      const cur = order.value.indexOf(photo.id);
      if (target !== cur) {
        const next = order.value.slice();
        next.splice(cur, 1);
        next.splice(target, 0, photo.id);
        order.value = next;
      }
    })
    .onFinalize(() => {
      if (activeId.value === photo.id) {
        activeId.value = null;
        runOnJS(onCommit)(order.value);
        runOnJS(onLock)(false);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          { position: "absolute", left: 0, top: 0, width: tile, height: tile, borderRadius: 14, backgroundColor: C.surfaceContainerHighest, shadowColor: "#000", shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
          style,
        ]}
      >
        <View style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}>
          <Image source={{ uri: photo.url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
        </View>

        <View style={{ position: "absolute", top: 6, left: 6, minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
          <AppText variant="caption" color="#fff" style={{ fontSize: 11 }}>{String(index + 1)}</AppText>
        </View>

        <Pressable
          onPress={() => onDelete(photo)}
          hitSlop={8}
          style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="close" size={14} color="#fff" />
        </Pressable>

        {index === 0 && !!firstBadge && (
          <View style={{ position: "absolute", left: 6, bottom: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: C.primary }}>
            <AppText variant="caption" color="#fff" style={{ fontSize: 11 }}>{firstBadge}</AppText>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

type GridLabels = {
  title: string;
  /** "foto" o "imagen": cómo se cuenta en "3 de 9 fotos". */
  noun: string;
  nouns: string;
  limit: number;
  tipTitle: string;
  tip: string;
  emptyTitle: string;
  emptyHint: string;
  addTitle: string;
  deleteTitle: string;
  deleteMessage: string;
  deletedToast: string;
  firstBadge?: string;
  icon: string;
};

type GridData = {
  photos: GalleryPhoto[];
  loading: boolean;
  add: UseMutationResult<void, Error, { uri: string; position: number }>;
  remove: UseMutationResult<void, Error, GalleryPhoto>;
  reorder: UseMutationResult<void, Error, GalleryPhoto[]>;
};

/** Cuadrícula de 3 en 3 que se reordena arrastrando; la usan la galería y el menú en imágenes. */
function PhotoGridEditor({ data, labels }: { data: GridData; labels: GridLabels }) {
  const { C } = useTheme();
  const toast = useToast();
  const lockScroll = useScrollLock();
  const { photos, add, remove, reorder } = data;
  const limit = labels.limit;

  const [pending, setPending] = useState(0);
  const [gridW, setGridW] = useState(0);
  const order = useSharedValue<string[]>([]);
  const activeId = useSharedValue<string | null>(null);

  useEffect(() => {
    order.value = photos.map((p) => p.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.map((p) => p.id).join(",")]);

  const remaining = limit - photos.length - pending;
  const tile = gridW > 0 ? (gridW - GAP * (COLS - 1)) / COLS : 0;
  const step = tile + GAP;
  const slots = photos.length + pending + (remaining > 0 ? 1 : 0);
  const gridH = slots > 0 ? Math.ceil(slots / COLS) * step - GAP : 0;
  const slotXY = (i: number) => ({ left: (i % COLS) * step, top: Math.floor(i / COLS) * step });

  async function uploadAll(uris: string[]) {
    let position = photos.reduce((m, p) => Math.max(m, p.position), -1) + 1;
    setPending((n) => n + uris.length);
    for (const uri of uris) {
      try {
        await add.mutateAsync({ uri, position: position++ });
      } catch (e: any) {
        toast.error(e?.message ?? `No se pudo subir una ${labels.noun}`);
      } finally {
        setPending((n) => n - 1);
      }
    }
  }

  function addPhotos() {
    if (remaining <= 0) return toast.info(`Ya tienes ${limit} ${labels.nouns}. Elimina una para agregar otra.`);
    Alert.alert(labels.addTitle, undefined, [
      {
        text: "Tomar foto",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return toast.error("Permiso de cámara denegado");
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85 });
          if (!r.canceled) uploadAll([r.assets[0].uri]);
        },
      },
      {
        text: "Elegir de la galería",
        onPress: async () => {
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.85 });
          if (!r.canceled) uploadAll(r.assets.slice(0, remaining).map((a) => a.uri));
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  /** Se llama al soltar una foto: guarda el orden si cambió. */
  function commit(ids: string[]) {
    const current = photos.map((p) => p.id);
    if (ids.length !== current.length || ids.every((id, i) => id === current[i])) return;
    const byId = new Map(photos.map((p) => [p.id, p]));
    const next = ids.map((id) => byId.get(id)).filter((p): p is GalleryPhoto => !!p);
    reorder.mutate(next, { onError: (e) => toast.error((e as Error).message) });
  }

  function confirmDelete(photo: GalleryPhoto) {
    Alert.alert(labels.deleteTitle, labels.deleteMessage, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => remove.mutate(photo, { onSuccess: () => toast.success(labels.deletedToast), onError: (e) => toast.error((e as Error).message) }),
      },
    ]);
  }

  const count = photos.length;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 4 }}>
        <AppText variant="heading" style={{ fontSize: 18 }}>{labels.title}</AppText>
        <AppText variant="label" color={count >= limit ? C.primary : C.onSurfaceVariant}>{count} de {limit} {labels.nouns}</AppText>
      </View>

      <View style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 16, backgroundColor: C.primaryFixed, borderWidth: 1, borderColor: C.border }}>
        <Icon name="lightbulb-on-outline" size={20} color={C.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">{labels.tipTitle}</AppText>
          <AppText variant="bodySm" color={C.onSurfaceVariant}>{labels.tip}</AppText>
        </View>
      </View>

      {data.loading ? (
        <ActivityIndicator color={C.primary} style={{ paddingVertical: 24 }} />
      ) : count === 0 && pending === 0 ? (
        <View style={{ alignItems: "center", gap: 10, padding: 24, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.outlineVariant, backgroundColor: C.surface }}>
          <Icon name={labels.icon} size={34} color={C.primary} />
          <AppText variant="bodyStrong" align="center">{labels.emptyTitle}</AppText>
          <AppText variant="bodySm" color={C.onSurfaceVariant} align="center">{labels.emptyHint}</AppText>
          <Button label={labels.addTitle} onPress={addPhotos} icon="plus" fullWidth={false} style={{ alignSelf: "center" }} />
        </View>
      ) : (
        <>
          <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)} style={{ height: tile > 0 ? gridH : undefined, minHeight: 1 }}>
            {tile > 0 && (
              <>
                {photos.map((p, i) => (
                  <Cell key={p.id} photo={p} initialIndex={i} tile={tile} count={count} order={order} activeId={activeId} onCommit={commit} onDelete={confirmDelete} onLock={lockScroll} firstBadge={labels.firstBadge} />
                ))}
                {Array.from({ length: pending }).map((_, i) => (
                  <View key={`p${i}`} style={[{ position: "absolute", width: tile, height: tile, borderRadius: 14, backgroundColor: C.surfaceContainerHighest, alignItems: "center", justifyContent: "center", gap: 6 }, slotXY(count + i)]}>
                    <ActivityIndicator color={C.primary} />
                    <AppText variant="caption" color={C.outline} style={{ fontSize: 11 }}>Subiendo…</AppText>
                  </View>
                ))}
                {remaining > 0 && (
                  <Pressable
                    onPress={addPhotos}
                    style={[{ position: "absolute", width: tile, height: tile, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.outline, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: C.surface }, slotXY(count + pending)]}
                  >
                    <Icon name="plus" size={26} color={C.primary} />
                    <AppText variant="caption" color={C.primary}>Agregar</AppText>
                  </Pressable>
                )}
              </>
            )}
          </View>
          {count > 1 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="gesture-tap-hold" size={16} color={C.outline} />
              <AppText variant="caption" color={C.outline} style={{ flex: 1 }}>Mantén presionada una foto y arrástrala para cambiar su lugar.</AppText>
            </View>
          )}
        </>
      )}
    </View>
  );
}

/** Galería de fotos del local: cuadrícula de 3 x 3 (hasta 9) que se reordena arrastrando. */
export function GallerySection({ restaurant }: { restaurant: OwnerRestaurant }) {
  const galleryQ = useGallery(restaurant.id);
  const { add, remove, reorder } = useGalleryMutations(restaurant.id);
  return (
    <PhotoGridEditor
      data={{ photos: galleryQ.data ?? [], loading: galleryQ.isLoading, add, remove, reorder }}
      labels={{
        title: "Galería",
        noun: "foto",
        nouns: "fotos",
        limit: GALLERY_LIMIT,
        tipTitle: "Que se te antoje",
        tip: "Fotos de tus platos, de frente y con buena luz. Con 3 o más, tu perfil se ve completo. La primera es la que más se ve.",
        emptyTitle: "Aún no tienes fotos",
        emptyHint: `Agrega hasta ${GALLERY_LIMIT}: tus platos, tu local, tu ambiente.`,
        addTitle: "Agregar fotos",
        deleteTitle: "Eliminar foto",
        deleteMessage: "Se borrará de tu galería. ¿Continuar?",
        deletedToast: "Foto eliminada",
        firstBadge: "Primera",
        icon: "image-multiple-outline",
      }}
    />
  );
}

/**
 * Menú en imágenes: las páginas de tu carta (hasta 10), aparte de la galería.
 * Sirve cuando manejas el menú por fotos y no por PDF.
 */
export function MenuImagesSection({ restaurant }: { restaurant: OwnerRestaurant }) {
  const menuQ = useMenuImages(restaurant.id);
  const { add, remove, reorder } = useMenuImageMutations(restaurant.id);
  return (
    <PhotoGridEditor
      data={{ photos: menuQ.data ?? [], loading: menuQ.isLoading, add, remove, reorder }}
      labels={{
        title: "Menú en imágenes",
        noun: "imagen",
        nouns: "imágenes",
        limit: MENU_IMAGES_LIMIT,
        tipTitle: "Tu carta, página por página",
        tip: "Sube una foto por página, derecha y con buena luz, para que se lea. Se ven aparte de tu galería y se pueden ampliar con los dedos.",
        emptyTitle: "Aún no tienes menú en imágenes",
        emptyHint: `Agrega hasta ${MENU_IMAGES_LIMIT} imágenes de tu carta.`,
        addTitle: "Agregar imágenes",
        deleteTitle: "Eliminar imagen",
        deleteMessage: "Se quitará de tu menú. ¿Continuar?",
        deletedToast: "Imagen eliminada",
        icon: "file-image-outline",
      }}
    />
  );
}
