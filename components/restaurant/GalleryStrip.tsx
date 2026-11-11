import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { PhotoViewer } from "@/components/ui/PhotoViewer";
import type { GalleryPhoto } from "@/lib/queries/gallery";
import { useTheme } from "@/lib/ThemeContext";
import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, Pressable, View, useWindowDimensions } from "react-native";

/**
 * Fotos del local para el comensal: una tira que se desliza y, al tocar una,
 * un visor a pantalla completa con zoom y paso entre fotos deslizando.
 */
export function GalleryStrip({
  photos,
  title = "Fotos",
  icon = "image-multiple-outline",
  viewerTitle = "Fotos del local",
}: {
  photos: GalleryPhoto[];
  title?: string;
  icon?: string;
  viewerTitle?: string;
}) {
  const { C } = useTheme();
  const { width: winW } = useWindowDimensions();
  const [open, setOpen] = useState<number | null>(null);

  if (photos.length === 0) return null;
  const single = photos.length === 1;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name={icon} size={18} color={C.primary} />
        <AppText variant="heading" style={{ fontSize: 20, lineHeight: 25 }}>{title}</AppText>
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
            onPress={() => setOpen(index)}
            style={{ width: single ? winW - 32 : 168, height: single ? 200 : 124, borderRadius: 16, overflow: "hidden", backgroundColor: C.surfaceContainerHighest }}
          >
            <Image source={{ uri: item.url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
          </Pressable>
        )}
      />

      <PhotoViewer urls={photos.map((p) => p.url)} startAt={open} onClose={() => setOpen(null)} title={viewerTitle} />
    </View>
  );
}
