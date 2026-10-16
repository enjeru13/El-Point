import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { METHOD_LABEL, PLAN_LABEL as PAY_PLAN_LABEL, type PaymentMethod, type PaymentPlan } from "./payments";

export type LocalStatus = "pending" | "approved" | "rejected" | "suspended";
export type PlanState = "founder" | "active" | "expiring" | "expired" | "none";

export type LocalRow = {
  id: string;
  name: string;
  status: LocalStatus;
  status_reason: string | null;
  is_active: boolean;
  founder_rank: number | null;
  paid_until: string | null;
  boost_until: string | null;
  ghost_kitchen: boolean;
  address: string | null;
  zone_label: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  owner_name: string;
  categories: string[];
  plan: PlanState;
};

const DAY = 86_400_000;

/** Estado del plan: "expiring" = activo pero vence en 7 días o menos. */
export function planState(founder_rank: number | null, paid_until: string | null): PlanState {
  if (founder_rank != null) return "founder";
  if (!paid_until) return "none";
  const left = new Date(paid_until).getTime() - Date.now();
  if (left <= 0) return "expired";
  return left <= 7 * DAY ? "expiring" : "active";
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY);
}

export const STATUS_LABEL: Record<LocalStatus, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  suspended: "Suspendido",
  rejected: "Rechazado",
};

export const PLAN_LABEL: Record<PlanState, string> = {
  founder: "Original",
  active: "Plan activo",
  expiring: "Por vencer",
  expired: "Vencido",
  none: "Sin plan",
};

const COLUMNS = `id, name, status, status_reason, is_active, founder_rank, paid_until, boost_until,
  ghost_kitchen, address, zone_label, rating_avg, rating_count, created_at,
  owner:profiles!owner_id ( username, full_name ),
  restaurant_categories ( categories ( label ) )`;

function ownerName(o: any): string {
  return o?.username ? `@${o.username}` : (o?.full_name ?? "Sin dueño");
}

export function useAllLocales() {
  return useQuery({
    queryKey: ["admin-locales"],
    queryFn: async (): Promise<LocalRow[]> => {
      const { data, error } = await supabase.from("restaurants").select(COLUMNS).order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        status_reason: r.status_reason ?? null,
        is_active: !!r.is_active,
        founder_rank: r.founder_rank ?? null,
        paid_until: r.paid_until ?? null,
        boost_until: r.boost_until ?? null,
        ghost_kitchen: !!r.ghost_kitchen,
        address: r.address ?? null,
        zone_label: r.zone_label ?? null,
        rating_avg: Number(r.rating_avg ?? 0),
        rating_count: Number(r.rating_count ?? 0),
        created_at: r.created_at,
        owner_name: ownerName(r.owner),
        categories: ((r.restaurant_categories ?? []) as any[]).map((rc) => rc.categories?.label).filter(Boolean),
        plan: planState(r.founder_rank ?? null, r.paid_until ?? null),
      }));
    },
  });
}

// ─── Detalle de un local ─────────────────────────────────────────────────────

export type LocalPayment = {
  id: string;
  method: string;
  reference: string;
  amount: number | null;
  plan: string | null;
  status: "pending" | "approved" | "rejected" | "voided";
  submitted_at: string;
  note: string | null;
};

export type TimelineEvent = {
  id: string;
  at: string;
  kind: "payment" | "plan" | "status";
  title: string;
  detail: string | null;
  by: string | null;
};

export type LocalDetail = {
  local: LocalRow & { description: string | null; accepts_orders: boolean; reviewed_at: string | null };
  contact: { whatsapp: string | null; phone: string | null; instagram: string | null; rif: string | null };
  payments: LocalPayment[];
  timeline: TimelineEvent[];
};

const ACTION_TITLE: Record<string, string> = {
  remove: "Plan quitado",
  add_days: "Días de cortesía",
  set_date: "Vencimiento fijado",
  remove_boost: "Destacado quitado",
  suspend: "Local suspendido",
  reactivate: "Local reactivado",
};

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function adminName(a: any): string | null {
  return a?.username ? `@${a.username}` : (a?.full_name ?? null);
}

export function useLocalDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-local", id],
    enabled: !!id,
    queryFn: async (): Promise<LocalDetail> => {
      const [base, priv, pays, adj, audit] = await Promise.all([
        supabase
          .from("restaurants")
          .select(`${COLUMNS}, description, accepts_orders, reviewed_at`)
          .eq("id", id!)
          .single(),
        supabase.rpc("admin_restaurant_private", { p_ids: [id!] }),
        supabase
          .from("restaurant_payments")
          .select("id, method, reference, amount, plan, status, submitted_at, note")
          .eq("restaurant_id", id!)
          .order("submitted_at", { ascending: false }),
        supabase
          .from("plan_adjustments")
          .select("id, action, old_paid_until, new_paid_until, reason, created_at, admin:profiles!admin_id ( username, full_name )")
          .eq("restaurant_id", id!)
          .order("created_at", { ascending: false }),
        supabase
          .from("admin_audit_log")
          .select("id, action, detail, created_at, admin:profiles!admin_id ( username, full_name )")
          .eq("restaurant_id", id!)
          .order("created_at", { ascending: false }),
      ]);
      if (base.error) throw base.error;

      const r: any = base.data;
      const p: any = ((priv.data ?? []) as any[])[0] ?? {};
      const payments = ((pays.data ?? []) as any[]).map((x) => ({ ...x, amount: x.amount != null ? Number(x.amount) : null })) as LocalPayment[];

      const timeline: TimelineEvent[] = [
        ...payments.map((x) => ({
          id: `p-${x.id}`,
          at: x.submitted_at,
          kind: "payment" as const,
          title: x.status === "voided" ? "Pago anulado" : x.status === "rejected" ? "Pago rechazado" : x.status === "pending" ? "Comprobante por verificar" : "Pago registrado",
          detail: `${x.plan ? (PAY_PLAN_LABEL[x.plan as PaymentPlan]?.split(" · ")[0] ?? x.plan) : "Plan"} · ${METHOD_LABEL[x.method as PaymentMethod] ?? x.method} · ref. ${x.reference}${x.amount != null ? ` · ${x.amount} USD` : ""}`,
          by: null,
        })),
        ...((adj.data ?? []) as any[]).map((x) => ({
          id: `a-${x.id}`,
          at: x.created_at,
          kind: "plan" as const,
          title: ACTION_TITLE[x.action] ?? x.action,
          detail: [x.action === "remove_boost" ? null : `${fmt(x.old_paid_until)} → ${fmt(x.new_paid_until)}`, x.reason].filter(Boolean).join(" · ") || null,
          by: adminName(x.admin),
        })),
        ...((audit.data ?? []) as any[]).map((x) => ({
          id: `u-${x.id}`,
          at: x.created_at,
          kind: "status" as const,
          title: ACTION_TITLE[x.action] ?? x.action,
          detail: x.detail?.reason ?? null,
          by: adminName(x.admin),
        })),
      ].sort((a, b) => b.at.localeCompare(a.at));

      return {
        local: {
          id: r.id,
          name: r.name,
          status: r.status,
          status_reason: r.status_reason ?? null,
          is_active: !!r.is_active,
          founder_rank: r.founder_rank ?? null,
          paid_until: r.paid_until ?? null,
          boost_until: r.boost_until ?? null,
          ghost_kitchen: !!r.ghost_kitchen,
          address: r.address ?? null,
          zone_label: r.zone_label ?? null,
          rating_avg: Number(r.rating_avg ?? 0),
          rating_count: Number(r.rating_count ?? 0),
          created_at: r.created_at,
          owner_name: ownerName(r.owner),
          categories: ((r.restaurant_categories ?? []) as any[]).map((rc) => rc.categories?.label).filter(Boolean),
          plan: planState(r.founder_rank ?? null, r.paid_until ?? null),
          description: r.description ?? null,
          accepts_orders: !!r.accepts_orders,
          reviewed_at: r.reviewed_at ?? null,
        },
        contact: {
          whatsapp: p.whatsapp ?? null,
          phone: p.phone ?? null,
          instagram: p.instagram ?? null,
          rif: p.rif ?? null,
        },
        payments,
        timeline,
      };
    },
  });
}

export type LocalStats = Record<string, number>;

/** Interacciones del local en los últimos 30 días (visitas, contactos, pedidos…). */
export function useLocalStats(id: string | undefined, days = 30) {
  return useQuery({
    queryKey: ["admin-local-stats", id, days],
    enabled: !!id,
    queryFn: async (): Promise<LocalStats> => {
      const { data, error } = await supabase.rpc("get_restaurant_stats", { p_restaurant_id: id!, p_days: days });
      if (error) throw error;
      const out: LocalStats = {};
      for (const row of (data ?? []) as { event_type: string; total: number }[]) {
        out[row.event_type] = (out[row.event_type] ?? 0) + Number(row.total);
      }
      return out;
    },
  });
}

/** Suspender o reactivar un local, con motivo (el dueño lo recibe como aviso). */
export function useSetLocalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: "suspend" | "reactivate"; reason?: string }) => {
      const { error } = await supabase.rpc("admin_set_restaurant_status", {
        p_restaurant_id: id,
        p_action: action,
        p_reason: reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-locales"] });
      qc.invalidateQueries({ queryKey: ["admin-local", v.id] });
      qc.invalidateQueries({ queryKey: ["admin-restaurant-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    },
  });
}
