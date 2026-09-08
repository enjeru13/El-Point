import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type MissionKey =
  | "first_review"
  | "photo_review"
  | "five_places"
  | "ten_helpful"
  | "streak_4"
  | "explorer_15";

export type MissionMeta = {
  key: MissionKey;
  title: string;
  description: string;
  icon: string;
  xp: number;
};

// Orden = orden de aparición en el perfil. Debe coincidir con mission_xp /
// mission_title de la migración 20260908160000.
export const MISSIONS: MissionMeta[] = [
  {
    key: "first_review",
    title: "Primera reseña",
    description: "Publica tu primer rank.",
    icon: "star",
    xp: 20,
  },
  {
    key: "photo_review",
    title: "Reseña con foto",
    description: "Sube una foto en una reseña.",
    icon: "camera-plus-outline",
    xp: 25,
  },
  {
    key: "five_places",
    title: "5 locales distintos",
    description: "Rankea 5 locales diferentes.",
    icon: "storefront-outline",
    xp: 60,
  },
  {
    key: "ten_helpful",
    title: '10 "me sirve"',
    description: "Recibe 10 marcas de útil en tus reseñas.",
    icon: "thumb-up",
    xp: 60,
  },
  {
    key: "streak_4",
    title: "Un mes en racha",
    description: "Rankea al menos una vez por semana, 4 semanas seguidas.",
    icon: "fire",
    xp: 100,
  },
  {
    key: "explorer_15",
    title: "Explorador",
    description: "Rankea 15 locales diferentes.",
    icon: "map-marker-distance",
    xp: 150,
  },
];

export function useMyMissions() {
  return useQuery({
    queryKey: ["my-missions"],
    queryFn: async (): Promise<Set<string>> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return new Set();
      const { data, error } = await supabase
        .from("user_missions")
        .select("mission")
        .eq("user_id", uid);
      if (error) throw error;
      return new Set((data ?? []).map((m) => m.mission));
    },
  });
}
