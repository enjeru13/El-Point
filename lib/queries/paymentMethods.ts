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
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, slug, label, icon")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as PaymentMethod[];
    },
  });
}
