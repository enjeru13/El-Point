import { paymentProofUrl, uploadPaymentProof } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type PaymentMethod = "bs_bcv" | "binance" | "bancolombia";

export type PaymentField = { label: string; value: string };
export type PaymentAccount = { name: string; fields: PaymentField[] };

export type PaymentMethodMeta = {
  key: PaymentMethod;
  label: string;
  icon: string;
  amountNote: string;
  accounts: PaymentAccount[];
};

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    key: "bs_bcv",
    label: "Bs a tasa BCV",
    icon: "cash",
    amountNote: "Monto: 10 USD al cambio BCV del día.",
    accounts: [
      {
        name: "Banco de Venezuela",
        fields: [
          { label: "Número de cuenta", value: "01020219150001796274" },
          { label: "Titular", value: "Angel Eduardo Cegarra Taborda" },
          { label: "Cédula", value: "V-26686507" },
        ],
      },
      {
        name: "Banco Mercantil",
        fields: [
          { label: "Número de cuenta", value: "01050762631762107228" },
          { label: "Titular", value: "Angel Eduardo Cegarra Taborda" },
          { label: "Cédula", value: "V-26686507" },
        ],
      },
    ],
  },
  {
    key: "binance",
    label: "Binance",
    icon: "bitcoin",
    amountNote: "Monto: 10 USD (o equivalente en USDT).",
    accounts: [
      {
        name: "Binance Pay",
        fields: [
          { label: "Correo", value: "angeleduardocegarrataborda@gmail.com" },
          { label: "Binance ID (UID)", value: "1025615911" },
        ],
      },
    ],
  },
  // Bancolombia queda para más adelante — solo Bs BCV y Binance en el
  // lanzamiento. El método sigue existiendo en la DB (restaurant_payments.method
  // lo permite) por si se reactiva sin otra migración.
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

/** Días restantes de vigencia; null si el local es Original (nunca vence). */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export { paymentProofUrl };
