import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import { AppState, Platform } from "react-native";
import { supabase } from "@/lib/supabase";

// Cuenta instalaciones y uso diario para el panel admin. Cada instalación
// tiene un id al azar guardado en el teléfono; al abrir la app se avisa con
// app_heartbeat(). No incluye nada personal y funciona sin cuenta.

const INSTALL_KEY = "elpoint.install_id";
const MIN_GAP_MS = 30 * 60_000;

let installId: Promise<string> | null = null;
let lastSent = 0;

function getInstallId(): Promise<string> {
  installId ??= (async () => {
    const saved = await AsyncStorage.getItem(INSTALL_KEY);
    if (saved) return saved;
    const id = Crypto.randomUUID();
    await AsyncStorage.setItem(INSTALL_KEY, id);
    return id;
  })();
  return installId;
}

async function send(force = false): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  const now = Date.now();
  if (!force && now - lastSent < MIN_GAP_MS) return;
  lastSent = now;
  try {
    const id = await getInstallId();
    const version = (Constants.expoConfig?.version ?? "0").slice(0, 20);
    const { error } = await supabase.rpc("app_heartbeat", {
      p_install_id: id,
      p_platform: Platform.OS,
      p_version: version,
    });
    if (error) lastSent = 0;
  } catch {
    lastSent = 0;
  }
}

/** Avisa al abrir la app, al volver a ella y al iniciar sesión. Devuelve cómo apagarlo. */
export function startHeartbeat(): () => void {
  void send();
  const appState = AppState.addEventListener("change", (s) => {
    if (s === "active") void send();
  });
  const { data: auth } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") void send(true);
  });
  return () => {
    appState.remove();
    auth.subscription.unsubscribe();
  };
}
