import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { GALLERY_LIMIT, useGallery, useGalleryMutations, type GalleryPhoto } from "@/lib/queries/gallery";
import type { OwnerRestaurant } from "@/lib/queries/owner";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GAP = 10;
const COLS = 3;

function Badge({ children }: { children: string }) {
  return (
    <View style={{ position: "absolute", top: 6, left: 6, minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
      <AppText variant="caption" color="#fff" style={{ fontSize: 11 }}>{children}</AppText>
    </View>
  );
}

/** Galería de fotos del local: hasta 8, en el orden en que las ve el comensal. */
export function GallerySection({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const galleryQ = useGallery(restaurant.id);
  const { add, remove, reorder } = useGalleryMutations(restaurant.id);
  const photos = galleryQ.data ?? [];

  const [pending, setPending] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gridW, setGridW] = useState(0);

  const remaining = GALLERY_LIMIT - photos.length - pending;
  const tile = gridW > 0 ? (gridW - GAP * (COLS - 1)) / COLS : 0;
  const idx = selectedId ? photos.findIndex((p) => p.id === selectedId) : -1;
  const selected = idx >= 0 ? photos[idx] : null;

  async function uploadAll(uris: string[]) {
    let position = photos.reduce((m, p) => Math.max(m, p.position), -1) + 1;
    setPending((n) => n + uris.length);
    for (const uri of uris) {
      try {
        await add.mutateAsync({ uri, position: position++ });
      } catch (e: any) {
        toast.error(e?.message ?? "No se pudo subir una foto");
      } finally {
        setPending((n) => n - 1);
      }
    }
  }

  function addPhotos() {
    if (remaining <= 0) return toast.info(`Ya tienes ${GALLERY_LIMIT} fotos. Elimina una para agregar otra.`);
    Alert.alert("Agregar fotos", undefined, [
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
          const r = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 0.85,
          });
          if (!r.canceled) uploadAll(r.assets.slice(0, remaining).map((a) => a.uri));
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  function move(dir: -1 | 1) {
    const other = idx + dir;
    if (other < 0 || other >= photos.length) return;
    const next = [...photos];
    [next[idx], next[other]] = [next[other], next[idx]];
    reorder.mutate(next, { onError: (e) => toast.error((e as Error).message) });
  }

  function makeFirst() {
    if (idx <= 0) return;
    const next = [photos[idx], ...photos.filter((_, i) => i !== idx)];
    reorder.mutate(next, { onError: (e) => toast.error((e as Error).message) });
  }

  function confirmDelete(photo: GalleryPhoto) {
    Alert.alert("Eliminar foto", "Se borrará de tu galería. ¿Continuar?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          remove.mutate(photo, {
            onSuccess: () => {
              setSelectedId(null);
              toast.success("Foto eliminada");
            },
            onError: (e) => toast.error((e as Error).message),
          }),
      },
    ]);
  }

  const count = photos.length;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 4 }}>
        <AppText variant="heading" style={{ fontSize: 18 }}>Galería</AppText>
        <AppText variant="label" color={count >= GALLERY_LIMIT ? C.primary : C.onSurfaceVariant}>{count} de {GALLERY_LIMIT} fotos</AppText>
      </View>

      <View style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 16, backgroundColor: C.primaryFixed, borderWidth: 1, borderColor: C.border }}>
        <Icon name="lightbulb-on-outline" size={20} color={C.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">Que se te antoje</AppText>
          <AppText variant="bodySm" color={C.onSurfaceVariant}>
            Fotos de tus platos, de frente y con buena luz. Con 3 o más, tu perfil se ve completo. La primera es la que más se ve.
          </AppText>
        </View>
      </View>

      {galleryQ.isLoading ? (
        <ActivityIndicator color={C.primary} style={{ paddingVertical: 24 }} />
      ) : count === 0 && pending === 0 ? (
        <View style={{ alignItems: "center", gap: 10, padding: 24, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.outlineVariant, backgroundColor: C.surface }}>
          <Icon name="image-multiple-outline" size={34} color={C.primary} />
          <AppText variant="bodyStrong" align="center">Aún no tienes fotos</AppText>
          <AppText variant="bodySm" color={C.onSurfaceVariant} align="center">Agrega hasta {GALLERY_LIMIT}: tus platos, tu local, tu ambiente.</AppText>
          <Button label="Agregar fotos" onPress={addPhotos} icon="plus" fullWidth={false} style={{ alignSelf: "center" }} />
        </View>
      ) : (
        <>
          <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
            {tile > 0 &&
              photos.map((p, i) => (
                <Pressable key={p.id} onPress={() => setSelectedId(p.id)} style={{ width: tile, height: tile, borderRadius: 14, overflow: "hidden", backgroundColor: C.surfaceContainerHighest }}>
                  <Image source={{ uri: p.url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
                  <Badge>{String(i + 1)}</Badge>
                  {i === 0 && (
                    <View style={{ position: "absolute", left: 6, bottom: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: C.primary }}>
                      <AppText variant="caption" color="#fff" style={{ fontSize: 11 }}>Primera</AppText>
                    </View>
                  )}
                </Pressable>
              ))}
            {tile > 0 &&
              Array.from({ length: pending }).map((_, i) => (
                <View key={`p${i}`} style={{ width: tile, height: tile, borderRadius: 14, backgroundColor: C.surfaceContainerHighest, alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <ActivityIndicator color={C.primary} />
                  <AppText variant="caption" color={C.outline} style={{ fontSize: 11 }}>Subiendo…</AppText>
                </View>
              ))}
            {tile > 0 && remaining > 0 && (
              <Pressable onPress={addPhotos} style={{ width: tile, height: tile, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.outline, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: C.surface }}>
                <Icon name="plus" size={26} color={C.primary} />
                <AppText variant="caption" color={C.primary}>Agregar</AppText>
              </Pressable>
            )}
          </View>
          <AppText variant="caption" color={C.outline}>Toca una foto para moverla, hacerla la primera o eliminarla.</AppText>
        </>
      )}

      {/* Visor: una foto grande con sus acciones */}
      <Modal visible={!!selected} animationType="fade" onRequestClose={() => setSelectedId(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 }}>
            <Pressable hitSlop={12} onPress={() => setSelectedId(null)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
              <Icon name="close" size={22} color="#fff" />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <AppText variant="bodyStrong" color="#fff">Foto {idx + 1} de {count}</AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.65)">{idx === 0 ? "Es la primera: la que más se ve" : `Hay ${idx} antes que ella`}</AppText>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={{ flex: 1 }}>
            {selected && <Image source={{ uri: selected.url }} style={{ flex: 1 }} contentFit="contain" />}
          </View>

          <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
            <Action icon="arrow-left" label="Antes" disabled={idx <= 0 || reorder.isPending} onPress={() => move(-1)} />
            <Action icon="arrow-right" label="Después" disabled={idx >= count - 1 || reorder.isPending} onPress={() => move(1)} />
            <Action icon="star-outline" label="Primera" disabled={idx <= 0 || reorder.isPending} onPress={makeFirst} />
            <Action icon="delete-outline" label="Eliminar" danger onPress={() => selected && confirmDelete(selected)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Action({ icon, label, onPress, disabled, danger }: { icon: string; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const color = danger ? "#ff7b72" : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.12)", opacity: disabled ? 0.35 : 1 }}
    >
      <Icon name={icon} size={22} color={color} />
      <AppText variant="caption" color={color} style={{ fontSize: 12 }}>{label}</AppText>
    </Pressable>
  );
}
