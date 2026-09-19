/**
 * Herramientas de prueba (pantalla QA, atajos de desarrollo). Activas en el
 * dev client (`__DEV__`) y en builds con EXPO_PUBLIC_QA_MODE=1 -- el perfil
 * `preview` de eas.json lo pone; `production` no, así que ahí no existen.
 * EXPO_PUBLIC_* se resuelve al momento del build, no en runtime.
 */
export const QA_MODE = __DEV__ || process.env.EXPO_PUBLIC_QA_MODE === "1";
