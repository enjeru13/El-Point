import { Platform } from "react-native";

/**
 * Cómo se cierra el teclado al arrastrar una lista o pantalla con campos.
 * En iOS "interactive" lo baja siguiendo el dedo (como Mensajes); en Android
 * "interactive" no existe, así que se cierra al empezar a arrastrar.
 * Con esto no hace falta un espacio en blanco donde tocar para bajar el teclado.
 */
export const KEYBOARD_DISMISS = Platform.OS === "ios" ? "interactive" : "on-drag";
