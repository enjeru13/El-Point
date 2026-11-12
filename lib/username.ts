// Nombre de usuario (@usuario): reglas y sugerencia a partir del nombre.
// Módulo puro (sin React Native) para probarlo con `node --test`.
//
// Mismas letras que acepta el registro: a-z, 0-9, "_" y ".". Las menciones lo
// buscan sin importar mayúsculas, así que dos personas no pueden tener el mismo
// usuario escrito distinto (se comprueba en la base antes de guardar).

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/** Quita lo que no se puede usar mientras se escribe (igual que el registro). */
export function cleanUsernameInput(raw: string): string {
  return raw.replace(/[^a-z0-9_.]/gi, "").slice(0, USERNAME_MAX);
}

/** Motivo por el que no sirve, o `null` si está bien. */
export function usernameProblem(u: string): string | null {
  if (u.length < USERNAME_MIN) return `Mínimo ${USERNAME_MIN} caracteres`;
  if (u.length > USERNAME_MAX) return `Máximo ${USERNAME_MAX} caracteres`;
  if (!/^[a-z0-9_.]+$/i.test(u)) return "Solo letras, números, _ y .";
  if (/^[._]|[._]$/.test(u)) return "No puede empezar ni terminar con . o _";
  if (/\.\./.test(u)) return "No puede tener dos puntos seguidos";
  return null;
}

/**
 * Sugerencia a partir del nombre ("Kelly Jeaneth Chacón" → "kellychacon") o, si
 * no hay nombre, de la parte del correo antes de la @. Sin tildes ni ñ.
 */
export function suggestUsername(fullName: string | null | undefined, email: string | null | undefined): string {
  const plain = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ñ/gi, "n")
      .toLowerCase();

  const words = plain(fullName ?? "")
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  let base = "";
  if (words.length >= 2) base = words[0] + words[words.length > 3 ? 2 : words.length - 1];
  else if (words.length === 1) base = words[0];

  if (base.length < USERNAME_MIN) {
    const local = plain((email ?? "").split("@")[0] ?? "").replace(/[^a-z0-9_.]/g, "");
    base = local.replace(/^[._]+|[._]+$/g, "").replace(/\.{2,}/g, ".");
  }
  if (base.length < USERNAME_MIN) base = "comensal";
  return base.slice(0, USERNAME_MAX - 3).replace(/[._]+$/g, "");
}

/** Variante con números al final para cuando la sugerencia ya está tomada. */
export function withSuffix(base: string, n: number): string {
  const suffix = String(n);
  return base.slice(0, USERNAME_MAX - suffix.length) + suffix;
}
