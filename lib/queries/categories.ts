import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type Category = {
  id: number;
  slug: string;
  label: string;
  icon: string;
};

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, label, icon")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}
