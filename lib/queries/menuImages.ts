import type { GalleryPhoto } from "@/lib/queries/gallery";
import { restaurantKeys } from "@/lib/queries/restaurants";
import { removeGalleryFile, uploadMenuImage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Imágenes del menú por local. Aparte de las 9 fotos de la galería. */
export const MENU_IMAGES_LIMIT = 10;

/** Misma forma que una foto de la galería: así comparten la cuadrícula y el visor. */
export type MenuImage = GalleryPhoto;

export function menuImagesKey(restaurantId: string) {
  return ["menu-images", restaurantId] as const;
}

export function useMenuImages(restaurantId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: menuImagesKey(restaurantId ?? ""),
    enabled: !!restaurantId && enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<MenuImage[]> => {
      const { data, error } = await supabase
        .from("restaurant_menu_images")
        .select("id, restaurant_id, storage_path, url, position")
        .eq("restaurant_id", restaurantId!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MenuImage[];
    },
  });
}

function menuImageError(e: any): Error {
  const msg: string = e?.message ?? "";
  if (msg.includes("menu_images_limit")) return new Error(`Llegaste al máximo de ${MENU_IMAGES_LIMIT} imágenes.`);
  if (e?.code === "42501" || msg.includes("row-level security")) return new Error("Tu plan no está activo: no se pueden guardar cambios en el menú.");
  return e instanceof Error ? e : new Error("No se pudo guardar la imagen.");
}

export function useMenuImageMutations(restaurantId: string | undefined) {
  const qc = useQueryClient();
  const refresh = () => {
    if (!restaurantId) return;
    qc.invalidateQueries({ queryKey: menuImagesKey(restaurantId) });
    qc.invalidateQueries({ queryKey: restaurantKeys(restaurantId) });
  };

  /** Sube una imagen y la agrega al final. */
  const add = useMutation({
    mutationFn: async ({ uri, position }: { uri: string; position: number }) => {
      if (!restaurantId) throw new Error("Sin local");
      const { path, url } = await uploadMenuImage(restaurantId, uri);
      const { error } = await supabase.from("restaurant_menu_images").insert({ restaurant_id: restaurantId, storage_path: path, url, position });
      if (error) {
        await removeGalleryFile(path);
        throw menuImageError(error);
      }
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: async (img: MenuImage) => {
      const { error } = await supabase.from("restaurant_menu_images").delete().eq("id", img.id);
      if (error) throw menuImageError(error);
      await removeGalleryFile(img.storage_path);
    },
    onSettled: refresh,
  });

  /** Reescribe el orden: recibe la lista completa ya ordenada. */
  const reorder = useMutation({
    mutationFn: async (ordered: MenuImage[]) => {
      const updates = ordered.map((p, i) => ({ id: p.id, position: i })).filter((u, i) => ordered[i].position !== u.position);
      const results = await Promise.all(updates.map((u) => supabase.from("restaurant_menu_images").update({ position: u.position }).eq("id", u.id)));
      const failed = results.find((r) => r.error);
      if (failed?.error) throw menuImageError(failed.error);
    },
    onMutate: async (ordered: MenuImage[]) => {
      if (!restaurantId) return;
      await qc.cancelQueries({ queryKey: menuImagesKey(restaurantId) });
      qc.setQueryData(menuImagesKey(restaurantId), ordered.map((p, i) => ({ ...p, position: i })));
    },
    onSettled: refresh,
  });

  return { add, remove, reorder };
}
