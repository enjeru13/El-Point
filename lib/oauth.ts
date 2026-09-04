import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
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

/**
 * Opens Google's consent screen in an in-app browser, catches the redirect
 * back into the app via the `elpoint://` scheme, and turns the tokens it
 * carries into a real Supabase session. Throws with message "CANCELLED" if
 * the user backs out — callers should treat that as a silent no-op, not an
 * error toast.
 */
export async function signInWithGoogle(): Promise<void> {
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
