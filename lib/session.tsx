import type { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

/**
 * La sesión actual, disponible en toda la app. `null` = visitante sin cuenta:
 * puede explorar, pero lo que guarda algo suyo pide cuenta (components/AuthGate).
 * Lo provee el layout raíz, que es quien escucha los cambios de sesión.
 */
const SessionContext = createContext<Session | null>(null);

export const SessionProvider = SessionContext.Provider;

export function useSession(): Session | null {
  return useContext(SessionContext);
}

/** ¿Es un visitante sin cuenta? */
export function useIsGuest(): boolean {
  return useContext(SessionContext) === null;
}
