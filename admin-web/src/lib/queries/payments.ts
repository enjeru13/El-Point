import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

export type PaymentMethod = "bs_bcv" | "binance" | "bancolombia";

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  bs_bcv: "Bs a tasa BCV",
  binance: "Binance",
  bancolombia: "Bancolombia",
};

export type PendingPayment = {
  id: string;
  method: PaymentMethod;
  reference: string;
  amount: number | null;
  proof_path: string;
  proof_url: string | null;
  submitted_at: string;
  restaurant_id: string;
  restaurant_name: string;
  owner_name: string;
};

const KEY = ["admin-pending-payments"] as const;

async function proofUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("restaurant-payments").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

async function fetchPending(): Promise<PendingPayment[]> {
  const { data, error } = await supabase
    .from("restaurant_payments")
    .select(
      `id, method, reference, amount, proof_path, submitted_at, restaurant_id,
       restaurant:restaurants!restaurant_id ( name ),
       owner:profiles!owner_id ( username, full_name )`,
    )
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });

  if (error) throw error;

  return await Promise.all(
    (data ?? []).map(async (p: any) => ({
      id: p.id,
      method: p.method,
      reference: p.reference,
      amount: p.amount,
      proof_path: p.proof_path,
      submitted_at: p.submitted_at,
      restaurant_id: p.restaurant_id,
      restaurant_name: p.restaurant?.name ?? "Local",
      owner_name: p.owner?.username ? `@${p.owner.username}` : (p.owner?.full_name ?? "Dueño"),
      proof_url: await proofUrl(p.proof_path),
    })),
  );
}

export function usePendingPayments() {
  return useQuery({ queryKey: KEY, queryFn: fetchPending });
}

export function useResolvePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      paymentId,
      action,
      note,
    }: {
      paymentId: string;
      action: "approve" | "reject";
      note?: string;
    }) => {
      const { error } = await supabase.rpc("admin_resolve_payment", {
        p_payment_id: paymentId,
        p_action: action,
        p_note: note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    },
  });
}
