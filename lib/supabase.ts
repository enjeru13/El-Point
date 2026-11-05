import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { Database } from "./database.types";
import { QA_MODE, qaFetch } from "./qa";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    ...(QA_MODE ? { global: { fetch: qaFetch } } : {}),
  },
);

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
