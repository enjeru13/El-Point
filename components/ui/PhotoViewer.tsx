import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { clampPan, nextZoom, shouldDismiss } from "@/lib/photoZoom";
import { Image } from "expo-image";
import { useCallback, useRef, useState } from "react";
import { FlatList, Modal, Pressable, View, useWindowDimensions, type ViewToken } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAX_SCALE = 4;

/**
 * Visor de fotos a pantalla completa, compartido por reseñas, galería del
 * local, menú en imágenes y publicaciones de Comunidad.
 *
 * - Deslizar a los lados cambia de foto.
 * - Pellizco y doble toque hacen zoom; con zoom, arrastrar mueve la foto.
 * - Sin zoom, deslizar hacia abajo la cierra.
 */
export function PhotoViewer({
  urls,
  startAt,
  onClose,
  title,
}: {
  urls: string[];
  /** Índice de la foto que se abre primero; `null` = cerrado. */
  startAt: number | null;
  onClose: () => void;
  /** Texto bajo el contador, por ejemplo "Menú". */
  title?: string;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const dragY = useSharedValue(0);

  const viewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.index;
    if (typeof first === "number") setCurrent(first);
  });

  const close = useCallback(() => {
    setZoomed(false);
    onClose();
  }, [onClose]);

  const backdrop = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.value, [0, 300], [1, 0.25], "clamp"),
  }));

  const open = startAt !== null;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ flex: 1, backgroundColor: "#000" }, backdrop]}>
          {open && (
            <FlatList
              data={urls}
              horizontal
              pagingEnabled
              scrollEnabled={!zoomed}
              initialScrollIndex={startAt}
              getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(u, i) => `${i}-${u}`}
              onViewableItemsChanged={viewable.current}
              viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
              renderItem={({ item }) => (
                <ZoomableImage uri={item} width={width} height={height} dragY={dragY} onZoomChange={setZoomed} onDismiss={close} />
              )}
            />
          )}
        </Animated.View>

        <View
          pointerEvents="box-none"
          style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", alignItems: "center" }}
        >
          <Pressable
            onPress={close}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cerrar foto"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="close" size={24} color="#fff" />
          </Pressable>
          <View pointerEvents="none" style={{ flex: 1, alignItems: "center" }}>
            {urls.length > 1 && (
              <AppText variant="bodyStrong" color="#fff">
                {current + 1} / {urls.length}
              </AppText>
            )}
            {title ? (
              <AppText variant="caption" color="rgba(255,255,255,0.7)">
                {title}
              </AppText>
            ) : null}
          </View>
          <View style={{ width: 44 }} />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomableImage({
  uri,
  width,
  height,
  dragY,
  onZoomChange,
  onDismiss,
}: {
  uri: string;
  width: number;
  height: number;
  dragY: { value: number };
  onZoomChange: (zoomed: boolean) => void;
  onDismiss: () => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const [zoomEnabled, setZoomEnabled] = useState(false);

  const setZoomed = useCallback(
    (z: boolean) => {
      setZoomEnabled(z);
      onZoomChange(z);
    },
    [onZoomChange],
  );

  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedScale.value = 1;
    savedTx.value = 0;
    savedTy.value = 0;
    runOnJS(setZoomed)(false);
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(0.8, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1.02) {
        reset();
      } else {
        savedScale.value = scale.value;
        const m = clampPan(tx.value, ty.value, scale.value, width, height);
        tx.value = withTiming(m.x);
        ty.value = withTiming(m.y);
        savedTx.value = m.x;
        savedTy.value = m.y;
        runOnJS(setZoomed)(true);
      }
    });

  // Con zoom: mover la foto dentro de sus bordes.
  const pan = Gesture.Pan()
    .enabled(zoomEnabled)
    .minPointers(1)
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      const m = clampPan(savedTx.value + e.translationX, savedTy.value + e.translationY, scale.value, width, height);
      tx.value = m.x;
      ty.value = m.y;
    });

  // Sin zoom: arrastrar hacia abajo cierra.
  const dismiss = Gesture.Pan()
    .enabled(!zoomEnabled)
    .activeOffsetY([-14, 14])
    .failOffsetX([-14, 14])
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (shouldDismiss(e.translationY, e.velocityY)) {
        runOnJS(onDismiss)();
        dragY.value = 0;
      } else {
        dragY.value = withSpring(0);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      const target = nextZoom(scale.value);
      if (target === 1) {
        reset();
      } else {
        scale.value = withTiming(target);
        savedScale.value = target;
        runOnJS(setZoomed)(true);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: dragY.value },
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(doubleTap, pinch, pan, dismiss)}>
      <Animated.View style={[{ width, height, justifyContent: "center" }, style]}>
        <Image source={{ uri }} style={{ width, height }} contentFit="contain" cachePolicy="memory-disk" />
      </Animated.View>
    </GestureDetector>
  );
}
