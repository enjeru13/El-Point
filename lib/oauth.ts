import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform, TurboModuleRegistry } from "react-native";
import { supabase } from "@/lib/supabase";

// Needed on web so the auth popup resolves the promise; harmless on native.
WebBrowser.maybeCompleteAuthSession();

/** Supabase puts the session tokens in the URL fragment (#access_token=...). */
function parseFragmentParams(url: string): Record<string, string> {
  const i = url.indexOf("#");
  if (i === -1) return {};
  const params: Record<string, string> = {};
  for (const pair of url.slice(i + 1).split("&")) {
    const [key, value] = pair.split("=");
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? "");
  }
  return params;
}

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * El módulo nativo solo existe en builds hechos DESPUÉS de instalar
 * @react-native-google-signin (un dev client viejo no lo trae): se pregunta
 * primero, sin importarlo, porque importar el paquete sin el módulo lanza.
 */
function nativeGoogleAvailable(): boolean {
  return (
    Platform.OS !== "web" &&
    !!GOOGLE_WEB_CLIENT_ID &&
    !!TurboModuleRegistry.get("RNGoogleSignin")
  );
}

/**
 * Inicio de sesión nativo: hoja de Google del sistema, sin navegador y sin el
 * aviso de iOS que mostraba el dominio de Supabase. El idToken de Google se
 * canjea por la sesión de Supabase.
 */
async function signInWithGoogleNative(): Promise<void> {
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = await import(
    "@react-native-google-signin/google-signin"
  );

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });

  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new Error("CANCELLED");

    const idToken = response.data.idToken;
    if (!idToken) throw new Error("Google no devolvió un token válido");

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error) throw error;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error("CANCELLED");
    }
    throw e;
  }
  // app/_layout.tsx recoge la sesión nueva y redirige solo.
}

/**
 * Inicia sesión con Google. Usa el flujo nativo si este build lo trae y está
 * configurado; si no, el flujo web de abajo. Lanza Error("CANCELLED") si la
 * persona se arrepiente: los llamadores lo tratan como no-op, no como error.
 */
export async function signInWithGoogle(): Promise<void> {
  if (nativeGoogleAvailable()) return signInWithGoogleNative();
  return signInWithGoogleWeb();
}

/**
 * Flujo web: abre el consentimiento de Google en un navegador integrado,
 * atrapa el redirect por el esquema `elpoint://` y convierte los tokens que
 * trae en una sesión de Supabase. En iOS muestra el aviso del sistema con el
 * dominio de Supabase; por eso el nativo es el preferido.
 */
async function signInWithGoogleWeb(): Promise<void> {
  const redirectTo = Linking.createURL("auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    throw error ?? new Error("No se pudo iniciar sesión con Google");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success" || !result.url) {
    throw new Error("CANCELLED");
  }

  const { access_token, refresh_token, error: oauthError, error_description } =
    parseFragmentParams(result.url);

  if (oauthError) {
    throw new Error(error_description || oauthError);
  }
  if (!access_token || !refresh_token) {
    throw new Error("Google no devolvió una sesión válida");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (sessionError) throw sessionError;
  // app/_layout.tsx recoge la sesión nueva y redirige solo.
}
