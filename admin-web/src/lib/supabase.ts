import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_KEY — copia .env.example a .env.",
  );
}

// Same project as the app (mobile) and the anon/publishable key — safe to
// expose client-side, every admin action is still gated server-side by
// is_admin() in RLS/RPCs. Session persists in localStorage by default.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
