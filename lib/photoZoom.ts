// Cuentas del visor de fotos con zoom. Funciones puras (con "worklet" para poder
// correr en el hilo de la interfaz) para probarlas con `node --test`.

/** Zoom al que salta el doble toque: si ya hay zoom vuelve a 1, si no, a 2,5. */
export function nextZoom(current: number): 1 | 2.5 {
  "worklet";
  return current > 1.05 ? 1 : 2.5;
}

/**
 * Mantiene la foto con zoom dentro de sus bordes: lo máximo que se puede correr
 * es la mitad de lo que crece (ancho × (escala − 1) / 2). Sin zoom no se mueve.
 */
export function clampPan(x: number, y: number, scale: number, width: number, height: number) {
  "worklet";
  const maxX = Math.max(0, ((scale - 1) * width) / 2);
  const maxY = Math.max(0, ((scale - 1) * height) / 2);
  // "+ 0" evita el -0 que deja Math.max(-0, …) cuando no hay margen.
  return { x: Math.min(maxX, Math.max(-maxX, x)) + 0, y: Math.min(maxY, Math.max(-maxY, y)) + 0 };
}

/** Deslizar hacia abajo cierra el visor: más de 120 px, o un tirón rápido. */
export function shouldDismiss(translationY: number, velocityY: number) {
  "worklet";
  return translationY > 120 || velocityY > 1200;
}
