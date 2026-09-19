import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

// Foreground: still show a banner + play sound (default is silent).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const projectId =
  Constants.expoConfig?.extra?.eas?.projectId ??
  (Constants as any).easConfig?.projectId;

/**
 * Ask for permission, get this device's Expo push token, and store it on the
 * signed-in user's profile. Safe to call repeatedly (on every launch/login).
 * No-ops on simulators and when permission is denied.
 */
export async function registerForPush(): Promise<void> {
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#c8451f",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return;

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return;
  }

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid || !token) return;

  await supabase.from("profiles").update({ push_token: token }).eq("id", uid);
}

/** Clear the token so a signed-out device stops receiving that user's pushes. */
export async function unregisterPush(uid: string): Promise<void> {
  await supabase.from("profiles").update({ push_token: null }).eq("id", uid);
}

/** Solo para QA: devuelve el token de esta instalación (sin guardarlo) o el motivo por el que no hay. */
export async function getPushTokenForQa(): Promise<{ token: string | null; reason?: string }> {
  if (!Device.isDevice) return { token: null, reason: "Simulador: no hay push" };
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return { token: null, reason: "Permiso de notificaciones no concedido" };
  try {
    return { token: (await Notifications.getExpoPushTokenAsync({ projectId })).data };
  } catch (e: any) {
    return { token: null, reason: e?.message ?? "No se pudo obtener el token" };
  }
}
