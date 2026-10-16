import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

export type PaymentMethod = "bs_bcv" | "binance" | "bancolombia" | "nequi" | "davivienda";
export type PaymentPlan = "monthly" | "quarterly" | "annual";

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  bs_bcv: "Bs a tasa BCV",
  binance: "Binance",
  bancolombia: "Bancolombia",
  nequi: "Nequi",
  davivienda: "Davivienda",
};

export const PLAN_LABEL: Record<PaymentPlan, string> = {
  monthly: "Mensual · US$3",
  quarterly: "Trimestral · US$7",
  annual: "Anual · US$18",
};

/** Lo que suma cada plan; debe coincidir con apply_payment_plan() en la base. */
export const PLAN_EFFECT: Record<PaymentPlan, string> = {
  monthly: "+1 mes · +3 días de Destacado",
  quarterly: "+3 meses · +7 días de Destacado",
  annual: "+1 año · +21 días de Destacado",
};

export type PendingPayment = {
  id: string;
  method: PaymentMethod;
  reference: string;
  amount: number | null;
  proof_path: string | null;
  proof_url: string | null;
  plan: PaymentPlan | null;
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
      `id, method, reference, amount, proof_path, plan, submitted_at, restaurant_id,
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
      plan: p.plan ?? null,
      proof_url: p.proof_path ? await proofUrl(p.proof_path) : null,
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

export type PlanRestaurant = { id: string; name: string; paid_until: string | null };

/** Locales que sí pagan plan: aprobados y no Originales. */
export function usePayingRestaurants() {
  return useQuery({
    queryKey: ["admin-paying-restaurants"],
    queryFn: async (): Promise<PlanRestaurant[]> => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, paid_until")
        .eq("status", "approved")
        .is("founder_rank", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as PlanRestaurant[];
    },
  });
}

/** Registra un pago ya recibido por WhatsApp y activa el plan. Devuelve el nuevo vencimiento. */
export function useRegisterPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      restaurantId: string;
      plan: PaymentPlan;
      method: PaymentMethod;
      reference: string;
      amount?: number;
      note?: string;
    }): Promise<string> => {
      const { data, error } = await supabase.rpc("admin_register_payment", {
        p_restaurant_id: input.restaurantId,
        p_plan: input.plan,
        p_method: input.method,
        p_reference: input.reference,
        p_amount: input.amount ?? null,
        p_note: input.note ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-paying-restaurants"] });
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      qc.invalidateQueries({ queryKey: ["admin-locales"] });
      qc.invalidateQueries({ queryKey: ["admin-local"] });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    },
  });
}

export type RecentPayment = {
  id: string;
  method: PaymentMethod;
  reference: string;
  amount: number | null;
  plan: PaymentPlan | null;
  status: "approved" | "voided" | "rejected";
  reviewed_at: string | null;
  submitted_at: string;
  note: string | null;
  restaurant_name: string;
};

/** Pagos ya aprobados (o anulados), los más recientes primero, para poder revisarlos o anularlos. */
export function useRecentPayments() {
  return useQuery({
    queryKey: ["admin-recent-payments"],
    queryFn: async (): Promise<RecentPayment[]> => {
      const { data, error } = await supabase
        .from("restaurant_payments")
        .select(
          `id, method, reference, amount, plan, status, reviewed_at, submitted_at, note,
           restaurant:restaurants!restaurant_id ( name )`,
        )
        .in("status", ["approved", "voided", "rejected"])
        .order("submitted_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        id: p.id,
        method: p.method,
        reference: p.reference,
        amount: p.amount,
        plan: p.plan ?? null,
        status: p.status,
        reviewed_at: p.reviewed_at,
        submitted_at: p.submitted_at,
        note: p.note,
        restaurant_name: p.restaurant?.name ?? "Local",
      }));
    },
  });
}

/** Anula un pago aprobado y le resta al local el tiempo y el Destacado que había sumado. */
export function useVoidPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason?: string }) => {
      const { error } = await supabase.rpc("admin_void_payment", {
        p_payment_id: paymentId,
        p_reason: reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-recent-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-paying-restaurants"] });
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      qc.invalidateQueries({ queryKey: ["admin-locales"] });
      qc.invalidateQueries({ queryKey: ["admin-local"] });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    },
  });
}

export type OwnerContact = { restaurant_id: string; whatsapp: string | null; phone: string | null };

/** WhatsApp y teléfono de varios locales (solo el admin los puede leer, por función). */
export function usePrivateContacts(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["admin-private-contacts", key],
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Map<string, OwnerContact>> => {
      const { data, error } = await supabase.rpc("admin_restaurant_private", { p_ids: ids });
      if (error) throw error;
      return new Map(((data ?? []) as OwnerContact[]).map((c) => [c.restaurant_id, c]));
    },
  });
}
