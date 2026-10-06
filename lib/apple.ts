import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * Inicio de sesión con Apple (obligatorio en iOS mientras haya Google, guía
 * 4.8 de App Store). El módulo nativo solo existe en builds hechos después de
 * instalar expo-apple-authentication: se pregunta antes de importarlo, porque
 * importarlo sin el módulo lanza.
 */
export function appleModuleLinked(): boolean {
  return Platform.OS === "ios" && !!requireOptionalNativeModule("ExpoAppleAuthentication");
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (!appleModuleLinked()) return false;
  try {
    const AppleAuthentication = await import("expo-apple-authentication");
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Lanza Error("CANCELLED") si la persona cierra la hoja de Apple. */
export async function signInWithApple(): Promise<void> {
  const AppleAuthentication = await import("expo-apple-authentication");
  const Crypto = await import("expo-crypto");

  // Apple firma el hash del nonce dentro del token; Supabase recibe el nonce
  // sin hashear y lo vuelve a hashear para compararlo.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  let credential: Awaited<ReturnType<typeof AppleAuthentication.signInAsync>>;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e: any) {
    if (e?.code === "ERR_REQUEST_CANCELED") throw new Error("CANCELLED");
    throw e;
  }

  if (!credential.identityToken) {
    throw new Error("Apple no devolvió un token válido");
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // Apple entrega el nombre solo la primera vez; si llegó, se guarda en el perfil.
  const { givenName, familyName } = credential.fullName ?? {};
  const fullName = [givenName, familyName].filter(Boolean).join(" ").trim();
  if (fullName) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("profiles").update({ full_name: fullName }).eq("id", data.user.id);
    }
  }
  // app/_layout.tsx recoge la sesión nueva y redirige solo.
}
