import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Ghost, Search } from "lucide-react";
import {
  PLAN_LABEL,
  STATUS_LABEL,
  daysUntil,
  useAllLocales,
  type LocalRow,
  type LocalStatus,
  type PlanState,
} from "../lib/queries/locales";
import { fmtDate } from "../lib/format";
import { Badge, EmptyState, INPUT, INPUT_AUTO, PageHeader, PageLoading, StatTile } from "../components/ui";

const STATUS_TONE: Record<LocalStatus, "good" | "brand" | "danger" | "neutral"> = {
  approved: "good",
  pending: "brand",
  suspended: "danger",
  rejected: "neutral",
};

const PLAN_TONE: Record<PlanState, "good" | "brand" | "danger" | "neutral" | "warn"> = {
  founder: "brand",
  active: "good",
  expiring: "warn",
  expired: "danger",
  none: "neutral",
};

function planDetail(l: LocalRow): string {
  if (l.plan === "founder") return `Original #${l.founder_rank}`;
  if (l.plan === "none") return "Nunca tuvo plan";
  const d = daysUntil(l.paid_until) ?? 0;
  if (l.plan === "expired") return `Venció hace ${Math.abs(d)} d`;
  return `Vence en ${d} d · ${fmtDate(l.paid_until)}`;
}

function Row({ l }: { l: LocalRow }) {
  return (
    <Link
      to={`/locales/${l.id}`}
      className="grid grid-cols-1 gap-1 px-1 py-3 transition-colors hover:bg-surface-2/60 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.7fr)] sm:items-center sm:gap-4 sm:px-3"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-text">{l.name}</p>
          {l.ghost_kitchen && <Ghost className="h-3.5 w-3.5 shrink-0 text-text-soft" strokeWidth={1.75} aria-label="Cocina fantasma" />}
        </div>
        <p className="truncate text-xs text-text-soft">
          {l.owner_name}
          {l.categories.length > 0 && ` · ${l.categories.slice(0, 2).join(", ")}`}
        </p>
      </div>
      <div>
        <Badge tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
      </div>
      <div className="min-w-0">
        <Badge tone={PLAN_TONE[l.plan]}>{PLAN_LABEL[l.plan]}</Badge>
        <p className="mt-0.5 truncate text-xs text-text-soft">{planDetail(l)}</p>
      </div>
      <p className="text-sm tabular-nums text-text-soft sm:text-right">
        {l.rating_count > 0 ? `★ ${l.rating_avg.toFixed(1)} (${l.rating_count})` : "Sin ranks"}
      </p>
    </Link>
  );
}

const STATUS_FILTERS: { value: "all" | LocalStatus; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "approved", label: "Aprobados" },
  { value: "pending", label: "Pendientes" },
  { value: "suspended", label: "Suspendidos" },
  { value: "rejected", label: "Rechazados" },
];

const PLAN_FILTERS: { value: "all" | PlanState; label: string }[] = [
  { value: "all", label: "Todos los planes" },
  { value: "founder", label: "Originales" },
  { value: "active", label: "Plan activo" },
  { value: "expiring", label: "Por vencer (7 días)" },
  { value: "expired", label: "Vencidos" },
  { value: "none", label: "Sin plan" },
];

export function Locales() {
  const q = useAllLocales();
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const estado = (params.get("estado") ?? "all") as "all" | LocalStatus;
  const plan = (params.get("plan") ?? "all") as "all" | PlanState;

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  const all = q.data ?? [];
  const approved = all.filter((l) => l.status === "approved");
  const counts = useMemo(
    () => ({
      approved: approved.length,
      paying: approved.filter((l) => l.plan === "active" || l.plan === "expiring").length,
      expiring: approved.filter((l) => l.plan === "expiring").length,
      expired: approved.filter((l) => l.plan === "expired" || l.plan === "none").length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.data],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = all.filter((l) => {
      if (estado !== "all" && l.status !== estado) return false;
      if (plan !== "all" && l.plan !== plan) return false;
      if (!term) return true;
      return l.name.toLowerCase().includes(term) || l.owner_name.toLowerCase().includes(term) || l.categories.some((c) => c.toLowerCase().includes(term));
    });
    // Lo que vence antes va arriba cuando se mira por vencimiento.
    if (plan === "expiring" || plan === "expired") {
      list = [...list].sort((a, b) => (a.paid_until ?? "").localeCompare(b.paid_until ?? ""));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, search, estado, plan]);

  const pick = (p: Record<string, string>) => setParams(p, { replace: true });
  const filtered = estado !== "all" || plan !== "all" || !!search;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Locales" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
        <button className="text-left" onClick={() => pick({ estado: "approved" })}>
          <StatTile label="Aprobados" value={counts.approved} hint="visibles en la app" />
        </button>
        <button className="text-left" onClick={() => pick({ estado: "approved", plan: "active" })}>
          <StatTile label="Con plan" value={counts.paying} hint="activos o por vencer" />
        </button>
        <button className="text-left" onClick={() => pick({ plan: "expiring" })}>
          <StatTile label="Por vencer" value={counts.expiring} hint="en 7 días" />
        </button>
        <button className="text-left" onClick={() => pick({ plan: "expired" })}>
          <StatTile label="Perfil básico" value={counts.expired} hint="plan vencido o sin plan" tone="danger" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" strokeWidth={1.75} />
          <input
            value={search}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Buscar por local, dueño o categoría"
            className={`${INPUT} pl-8`}
            aria-label="Buscar locales"
          />
        </div>
        <select className={INPUT_AUTO} value={estado} onChange={(e) => set("estado", e.target.value)} aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select className={INPUT_AUTO} value={plan} onChange={(e) => set("plan", e.target.value)} aria-label="Filtrar por plan">
          {PLAN_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {filtered && (
          <button onClick={() => setParams({}, { replace: true })} className="px-2 text-sm font-medium text-text-soft hover:text-text">
            Limpiar
          </button>
        )}
      </div>

      {q.isLoading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <EmptyState title="Ningún local coincide" body="Prueba con otra búsqueda o quita algún filtro." />
      ) : (
        <div>
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.7fr)] gap-4 border-b border-border px-3 pb-2 text-xs font-medium text-text-soft sm:grid">
            <span>Local</span>
            <span>Estado</span>
            <span>Plan</span>
            <span className="text-right">Calificación</span>
          </div>
          <div className="divide-y divide-border/60">
            {rows.map((l) => (
              <Row key={l.id} l={l} />
            ))}
          </div>
          <p className="border-t border-border px-1 pt-3 text-xs text-text-soft sm:px-3">
            {rows.length} {rows.length === 1 ? "local" : "locales"}
          </p>
        </div>
      )}
    </div>
  );
}
