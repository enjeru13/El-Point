import { CONTENT_MAX_W, useResponsive } from "@/lib/responsive";
import { useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";

// Degradado sin librería nativa: franjas de opacidad creciente.
const FADE_STEPS = [1, 0.85, 0.65, 0.45, 0.28, 0.14, 0.05];
const STRIP_W = 4;

function EdgeFade({ side, color }: { side: "left" | "right"; color: string }) {
  const steps = side === "left" ? FADE_STEPS : [...FADE_STEPS].reverse();
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: STRIP_W * FADE_STEPS.length,
        flexDirection: "row",
      }}
    >
      {steps.map((o, i) => (
        <View key={i} style={{ width: STRIP_W, backgroundColor: color, opacity: o }} />
      ))}
    </View>
  );
}

/**
 * Fila horizontal de chips.
 *  - Margen vertical para que el halo del chip activo no se corte (el
 *    ScrollView recorta todo lo que sale de su caja).
 *  - `constrain` (tablet): la fila ocupa la misma columna que la barra de
 *    búsqueda en vez de correr hasta el borde de la pantalla, y difumina los
 *    extremos cuando hay más chips por ver. Requiere `fadeColor` igual al
 *    fondo que tiene detrás.
 */
export function ChipRow({
  children,
  constrain = false,
  fadeColor,
  gap = 8,
  side = 16,
}: {
  children: ReactNode;
  constrain?: boolean;
  fadeColor?: string;
  gap?: number;
  side?: number;
}) {
  const { isTablet, width } = useResponsive();
  const [x, setX] = useState(0);
  const [viewW, setViewW] = useState(0);
  const [contentW, setContentW] = useState(0);

  const capped = constrain && isTablet;
  const showFade = capped && !!fadeColor;
  const canScroll = contentW > viewW + 1;
  const leftFade = showFade && canScroll && x > 4;
  const rightFade = showFade && canScroll && x + viewW < contentW - 4;

  // Fuera de la columna (teléfono, o sin `constrain`): a todo el ancho, con el
  // primer chip alineado al borde de la columna de contenido.
  const edge = capped ? side : Math.max(side, isTablet ? (width - CONTENT_MAX_W) / 2 + side : side);

  return (
    <View
      style={
        capped
          ? { width: "100%", maxWidth: CONTENT_MAX_W, alignSelf: "center" }
          : undefined
      }
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => setX(e.nativeEvent.contentOffset.x)}
        onLayout={(e) => setViewW(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentW(w)}
        contentContainerStyle={{
          paddingHorizontal: edge,
          paddingVertical: 12,
          gap,
          alignItems: "center",
        }}
      >
        {children}
      </ScrollView>
      {leftFade && <EdgeFade side="left" color={fadeColor!} />}
      {rightFade && <EdgeFade side="right" color={fadeColor!} />}
    </View>
  );
}
