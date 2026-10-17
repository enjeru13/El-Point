import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import type { GalleryPhoto } from "@/lib/queries/gallery";
import { useTheme } from "@/lib/ThemeContext";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import { FlatList, Modal, Pressable, View, useWindowDimensions, type ViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Fotos del local para el comensal: una tira que se desliza y, al tocar una,
 * un visor a pantalla completa con paso entre fotos deslizando.
 */
export function GalleryStrip({ photos }: { photos: GalleryPhoto[] }) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [open, setOpen] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const viewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.index;
    if (typeof first === "number") setCurrent(first);
  });

  if (photos.length === 0) return null;
  const single = photos.length === 1;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="image-multiple-outline" size={18} color={C.primary} />
        <AppText variant="heading" style={{ fontSize: 20, lineHeight: 25 }}>Fotos</AppText>
      </View>

      <FlatList
        data={photos}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.id}
        // El margen negativo deja que la tira llegue al borde de la pantalla.
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => {
              setCurrent(index);
              setOpen(index);
            }}
            style={{ width: single ? winW - 32 : 168, height: single ? 200 : 124, borderRadius: 16, overflow: "hidden", backgroundColor: C.surfaceContainerHighest }}
          >
            <Image source={{ uri: item.url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
          </Pressable>
        )}
      />

      <Modal visible={open !== null} animationType="fade" onRequestClose={() => setOpen(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {open !== null && (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(p) => p.id}
              initialScrollIndex={open}
              getItemLayout={(_, i) => ({ length: winW, offset: winW * i, index: i })}
              onViewableItemsChanged={viewable.current}
              viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
              renderItem={({ item }) => (
                <View style={{ width: winW, flex: 1, justifyContent: "center" }}>
                  <Image source={{ uri: item.url }} style={{ width: winW, height: "100%" }} contentFit="contain" />
                </View>
              )}
            />
          )}
          <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", alignItems: "center" }}>
            <Pressable hitSlop={12} onPress={() => setOpen(null)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
              <Icon name="close" size={22} color="#fff" />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <AppText variant="bodyStrong" color="#fff">{current + 1} / {photos.length}</AppText>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
