import { paymentProofUrl, uploadPaymentProof } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type PaymentMethod = "bs_bcv" | "binance" | "bancolombia";

export type PaymentMethodMeta = {
  key: PaymentMethod;
  label: string;
  icon: string;
  /** Placeholder instructions — reemplazar con los datos reales de cobro
   *  (cuenta, cédula/RIF, usuario Binance, cuenta Bancolombia, etc.)
   *  antes de anunciar el cobro a los dueños. */
  instructions: string[];
};

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    key: "bs_bcv",
    label: "Bs a tasa BCV",
    icon: "cash",
    instructions: [
      "[Pendiente] Banco: —",
      "[Pendiente] Titular / Cédula: —",
      "[Pendiente] Número de cuenta o pago móvil: —",
      "Monto: 10 USD al cambio BCV del día.",
    ],
  },
  {
    key: "binance",
    label: "Binance",
    icon: "bitcoin",
    instructions: [
      "[Pendiente] Usuario / ID de Binance Pay: —",
      "[Pendiente] Red y moneda aceptada: —",
      "Monto: 10 USD (o equivalente en USDT).",
    ],
  },
  {
    key: "bancolombia",
    label: "Bancolombia",
    icon: "bank",
    instructions: [
      "[Pendiente] Tipo de cuenta: —",
      "[Pendiente] Número de cuenta: —",
      "[Pendiente] Titular / Cédula: —",
      "Monto: 10 USD al cambio del día.",
    ],
  },
];

export type RestaurantPayment = {
  id: string;
  method: PaymentMethod;
  reference: string;
  amount: number | null;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

const MY_PAYMENTS_KEY = ["my-restaurant-payments"] as const;

// `restaurant_payments` is brand new — the generated Supabase types don't
// know about it until `supabase gen types` runs again against the pushed
// migration. Typed as `RestaurantPayment` by hand instead below.
function paymentsTable() {
  return (supabase as any).from("restaurant_payments");
}

export function useMyPayments(restaurantId: string | undefined) {
  return useQuery({
    queryKey: [...MY_PAYMENTS_KEY, restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<RestaurantPayment[]> => {
      const { data, error } = await paymentsTable()
        .select("id, method, reference, amount, status, note, submitted_at, reviewed_at")
        .eq("restaurant_id", restaurantId!)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RestaurantPayment[];
    },
  });
}

export function useSubmitPayment(restaurantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      method,
      reference,
      amount,
      photoUri,
    }: {
      method: PaymentMethod;
      reference: string;
      amount?: number;
      photoUri: string;
    }) => {
      if (!restaurantId) throw new Error("Sin local");
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error("Sesión expirada");

      const proofPath = await uploadPaymentProof(userData.user.id, restaurantId, photoUri);

      const { error } = await paymentsTable().insert({
        restaurant_id: restaurantId,
        owner_id: userData.user.id,
        method,
        reference: reference.trim(),
        amount: amount ?? null,
        proof_path: proofPath,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MY_PAYMENTS_KEY });
    },
  });
}

/** Días restantes de vigencia; null si el local es Fundador (nunca vence). */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export { paymentProofUrl };
