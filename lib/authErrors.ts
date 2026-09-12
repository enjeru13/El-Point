/**
 * Supabase/GoTrue error messages come in English by default (no i18n option
 * on the client). Map the ones users can actually hit to Spanish; anything
 * unmapped falls back to the raw message rather than hiding it.
 */
const MAP: { match: RegExp; es: string }[] = [
  {
    match: /user already registered|already been registered|email.*already.*(exists|registered)/i,
    es: "Ya existe una cuenta con este correo. Inicia sesión o usa «Olvidé mi contraseña».",
  },
  {
    match: /invalid login credentials/i,
    es: "Correo o contraseña incorrectos.",
  },
  {
    match: /email not confirmed/i,
    es: "Confirma tu correo antes de iniciar sesión — revisa tu bandeja de entrada.",
  },
  {
    match: /password should be at least/i,
    es: "La contraseña debe tener al menos 8 caracteres.",
  },
  {
    match: /email rate limit exceeded|for security purposes.*only request this/i,
    es: "Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.",
  },
  {
    match: /unable to validate email address|invalid email/i,
    es: "Ese correo no es válido.",
  },
  {
    match: /token has expired or is invalid/i,
    es: "El código venció o no es válido. Pide uno nuevo.",
  },
  {
    match: /network request failed|failed to fetch/i,
    es: "Sin conexión — revisa tu internet e inténtalo de nuevo.",
  },
];

/** Translates a known Supabase auth error message to es-VE; passes through
 *  anything not recognized instead of swallowing it. */
export function authErrorEs(message: string | null | undefined): string {
  if (!message) return "Ocurrió un error. Intenta de nuevo.";
  const hit = MAP.find((m) => m.match.test(message));
  return hit ? hit.es : message;
}
