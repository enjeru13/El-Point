/**
 * Herramientas de prueba (pantalla QA, atajos de desarrollo). Activas en el
 * dev client (`__DEV__`) y en builds con EXPO_PUBLIC_QA_MODE=1 -- el perfil
 * `preview` de eas.json lo pone; `production` no, así que ahí no existen.
 * EXPO_PUBLIC_* se resuelve al momento del build, no en runtime.
 */
export const QA_MODE = __DEV__ || process.env.EXPO_PUBLIC_QA_MODE === "1";

/** Banderas que la pantalla QA enciende para forzar fallos de red. */
export const qaFlags = {
  /** Todas las peticiones de Supabase fallan como si no hubiera red. */
  failNetwork: false,
  /** Retraso artificial (ms) antes de cada petición. */
  latencyMs: 0,
};

/**
 * fetch que usa el cliente de Supabase. En builds sin QA_MODE es exactamente
 * `fetch` (se pasa directo en lib/supabase.ts, ni siquiera existe este envoltorio).
 */
export const qaFetch: typeof fetch = async (input, init) => {
  if (qaFlags.latencyMs > 0) {
    await new Promise((r) => setTimeout(r, qaFlags.latencyMs));
  }
  if (qaFlags.failNetwork) {
    throw new TypeError("Network request failed (QA)");
  }
  return fetch(input, init);
};
