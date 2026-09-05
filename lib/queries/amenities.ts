import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type Amenity = {
  id: number;
  slug: string;
  label: string;
  icon: string;
};

export function useAmenities() {
  return useQuery({
    queryKey: ["amenities"],
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<Amenity[]> => {
      const { data, error } = await supabase
        .from("amenities")
        .select("id, slug, label, icon")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Amenity[];
    },
  });
}
