import { PhotoViewer } from "@/components/ui/PhotoViewer";
import { AppText } from "@/components/ui/AppText";
import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";

const RATIO = 4 / 5; // alto = ancho × 0,8, como Instagram en vertical suave

/**
 * Fotos de un post a lo ancho del contenido. Varias: carrusel deslizable con
 * puntos y "1/3". Al tocar se abren a pantalla completa con zoom;
 * se cierran deslizando hacia abajo o con la X.
 */
export function PhotoCarousel({ urls }: { urls: string[] }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [viewerAt, setViewerAt] = useState<number | null>(null);

  if (urls.length === 0) return null;
  // En iPad la foto no crece más de 520 de alto, para no ocupar toda la pantalla.
  const height = Math.min(Math.round(width * RATIO), 520);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ borderRadius: 16, overflow: "hidden", marginTop: 10 }}
    >
      {width > 0 && (
        <FlatList
          data={urls}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(u) => u}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: i }) => (
            <Pressable
              onPress={() => setViewerAt(i)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Foto ${i + 1} de ${urls.length}. Toca para verla completa`}
            >
              <Image
                source={{ uri: item }}
                style={{ width, height }}
                contentFit="cover"
                transition={180}
                cachePolicy="memory-disk"
              />
            </Pressable>
          )}
        />
      )}
      {urls.length > 1 && (
        <>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              backgroundColor: "rgba(0,0,0,0.6)",
              borderRadius: 99,
              paddingHorizontal: 9,
              paddingVertical: 3,
            }}
          >
            <AppText variant="caption" color="#fff">
              {index + 1}/{urls.length}
            </AppText>
          </View>
          <View
            pointerEvents="none"
            style={{ position: "absolute", bottom: 10, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 5 }}
          >
            {urls.map((u, i) => (
              <View
                key={u}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#fff",
                  opacity: i === index ? 1 : 0.5,
                }}
              />
            ))}
          </View>
        </>
      )}
      <PhotoViewer urls={urls} startAt={viewerAt} onClose={() => setViewerAt(null)} />
    </View>
  );
}
