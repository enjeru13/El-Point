import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { createChunkedStore } from "./chunkedStore";
import type { Database } from "./database.types";
import { QA_MODE, qaFetch } from "./qa";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// La sesión se guarda por partes: la de una cuenta de Google o Apple puede pasar
// el límite de ~2 KB de SecureStore y, si no se guardaba, la persona aparecía
// desconectada al volver a abrir la app (ver lib/chunkedStore.ts).
const SessionStore = createChunkedStore(ExpoSecureStoreAdapter);

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: SessionStore,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    ...(QA_MODE ? { global: { fetch: qaFetch } } : {}),
  },
);

// La sesión no vence por tiempo: el token de 1 hora se renueva solo. Como
// recomienda Supabase en apps móviles, la renovación se pausa en segundo plano y
// se reanuda al volver; así, tras horas sin abrir la app, la primera acción ya
// sale con un token vigente.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/**
 * El usuario de la sesión guardada en el teléfono, con la misma forma que
 * `supabase.auth.getUser` pero sin ir al servidor (getUser hace un viaje
 * de red en cada llamada y retrasaba cada acción). Es seguro en el cliente:
 * la base de datos verifica el token en cada consulta con RLS.
 */
export async function getSessionUser() {
  const { data, error } = await supabase.auth.getSession();
  return { data: { user: data.session?.user ?? null }, error };
}
