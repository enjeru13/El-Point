import AsyncStorage from "@react-native-async-storage/async-storage";

/** Borrador de "Nuevo post": no se pierde si sales sin querer. */
export type PostDraft = {
  body: string;
  topic: string;
  photos: string[];
  restaurant: { id: string; name: string; category: string | null } | null;
  suggested: { name: string; zone: string } | null;
  categoryIds: number[];
  /** Id del post que se va a crear: reabrir el borrador y publicar no duplica. */
  clientId?: string;
};

const key = (asRestaurantId?: string | null) =>
  asRestaurantId ? `community-draft:${asRestaurantId}` : "community-draft";

export async function loadDraft(asRestaurantId?: string | null): Promise<PostDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(key(asRestaurantId));
    return raw ? (JSON.parse(raw) as PostDraft) : null;
  } catch {
    return null;
  }
}

export async function saveDraft(d: PostDraft, asRestaurantId?: string | null): Promise<void> {
  try {
    const empty = !d.body.trim() && d.photos.length === 0;
    if (empty) await AsyncStorage.removeItem(key(asRestaurantId));
    else await AsyncStorage.setItem(key(asRestaurantId), JSON.stringify(d));
  } catch {
    // Guardar el borrador es una ayuda, no algo que deba romper la pantalla.
  }
}

export async function clearDraft(asRestaurantId?: string | null): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(asRestaurantId));
  } catch {
    // Igual que arriba.
  }
}
