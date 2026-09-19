import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type PaymentMethod = {
  id: number;
  slug: string;
  label: string;
  icon: string;
};

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<PaymentMethod[]> => {
      // Tabla nueva: los tipos generados no la conocen hasta regenerarlos
      // contra la DB con la migración ya pusheada.
      const { data, error } = await (supabase as any)
        .from("payment_methods")
        .select("id, slug, label, icon")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as PaymentMethod[];
    },
  });
}
