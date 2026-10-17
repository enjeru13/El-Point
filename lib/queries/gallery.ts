import { restaurantKeys } from "@/lib/queries/restaurants";
import { removeGalleryFile, uploadGalleryPhoto } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const GALLERY_LIMIT = 9;

export type GalleryPhoto = {
  id: string;
  restaurant_id: string;
  storage_path: string;
  url: string;
  position: number;
};

export function galleryKey(restaurantId: string) {
  return ["gallery", restaurantId] as const;
}

export function useGallery(restaurantId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: galleryKey(restaurantId ?? ""),
    enabled: !!restaurantId && enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<GalleryPhoto[]> => {
      const { data, error } = await supabase
        .from("restaurant_photos")
        .select("id, restaurant_id, storage_path, url, position")
        .eq("restaurant_id", restaurantId!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GalleryPhoto[];
    },
  });
}

function galleryError(e: any): Error {
  const msg: string = e?.message ?? "";
  if (msg.includes("gallery_limit")) return new Error(`Llegaste al máximo de ${GALLERY_LIMIT} fotos.`);
  if (e?.code === "42501" || msg.includes("row-level security")) return new Error("Tu plan no está activo: no se pueden guardar cambios en la galería.");
  return e instanceof Error ? e : new Error("No se pudo guardar la foto.");
}

export function useGalleryMutations(restaurantId: string | undefined) {
  const qc = useQueryClient();
  const refresh = () => {
    if (!restaurantId) return;
    qc.invalidateQueries({ queryKey: galleryKey(restaurantId) });
    qc.invalidateQueries({ queryKey: restaurantKeys(restaurantId) });
  };

  /** Sube una foto y la agrega al final. */
  const add = useMutation({
    mutationFn: async ({ uri, position }: { uri: string; position: number }) => {
      if (!restaurantId) throw new Error("Sin local");
      const { path, url } = await uploadGalleryPhoto(restaurantId, uri);
      const { error } = await supabase.from("restaurant_photos").insert({ restaurant_id: restaurantId, storage_path: path, url, position });
      if (error) {
        await removeGalleryFile(path);
        throw galleryError(error);
      }
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: async (photo: GalleryPhoto) => {
      const { error } = await supabase.from("restaurant_photos").delete().eq("id", photo.id);
      if (error) throw galleryError(error);
      await removeGalleryFile(photo.storage_path);
    },
    onSettled: refresh,
  });

  /** Reescribe el orden: recibe la lista completa ya ordenada. */
  const reorder = useMutation({
    mutationFn: async (ordered: GalleryPhoto[]) => {
      const updates = ordered.map((p, i) => ({ id: p.id, position: i })).filter((u, i) => ordered[i].position !== u.position);
      const results = await Promise.all(updates.map((u) => supabase.from("restaurant_photos").update({ position: u.position }).eq("id", u.id)));
      const failed = results.find((r) => r.error);
      if (failed?.error) throw galleryError(failed.error);
    },
    // El orden se ve al instante; si falla, se vuelve a pedir el real.
    onMutate: async (ordered: GalleryPhoto[]) => {
      if (!restaurantId) return;
      await qc.cancelQueries({ queryKey: galleryKey(restaurantId) });
      qc.setQueryData(galleryKey(restaurantId), ordered.map((p, i) => ({ ...p, position: i })));
    },
    onSettled: refresh,
  });

  return { add, remove, reorder };
}
