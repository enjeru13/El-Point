/**
 * Marca que un registro está en curso. Mientras dura, el enrutador raíz no
 * manda al usuario a su pantalla principal aunque ya haya sesión: el registro
 * todavía está creando el perfil o el local y termina él mismo en la pantalla
 * de bienvenida. Sin esto, la sesión recién creada hacía saltar la app al
 * inicio antes de tiempo y se veían pantallas equivocadas por un instante.
 */
let active = false;

export function beginAuthFlow(): void {
  active = true;
}

export function endAuthFlow(): void {
  active = false;
}

export function isAuthFlowActive(): boolean {
  return active;
}
