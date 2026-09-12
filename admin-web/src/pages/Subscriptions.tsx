import { useMemo, useState } from "react";
import { AlertTriangle, Ban, Crown, Wallet } from "lucide-react";
import {
  daysLeft,
  useSubscriptions,
  type RestaurantSubscription,
  type SubStatus,
} from "../lib/queries/subscriptions";
import { Badge, EmptyState, PageHeader, PageLoading, StripeCard } from "../components/ui";

const FILTERS: { key: SubStatus | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "expired", label: "Vencidos" },
  { key: "active", label: "Activos" },
  { key: "founder", label: "Originales" },
  { key: "none", label: "Sin plan" },
];

const STATUS_META: Record<SubStatus, { label: string; tone: "brand" | "danger" | "good" | "neutral"; stripe: "brand" | "danger" | "neutral" }> = {
  founder: { label: "Original", tone: "brand", stripe: "brand" },
  active: { label: "Activo", tone: "good", stripe: "neutral" },
  expired: { label: "Vencido", tone: "danger", stripe: "danger" },
  none: { label: "Sin plan", tone: "neutral", stripe: "neutral" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

function Row({ r }: { r: RestaurantSubscription }) {
  const meta = STATUS_META[r.status];
  const left = daysLeft(r.paid_until);

  let detail: string;
  if (r.status === "founder") detail = `Original #${r.founder_rank}`;
  else if (r.status === "none") detail = "Nunca tuvo plan asignado";
  else if (r.status === "expired") detail = `Venció hace ${Math.abs(left ?? 0)} día${Math.abs(left ?? 0) === 1 ? "" : "s"} · ${fmtDate(r.paid_until)}`;
  else detail = `${left} día${left === 1 ? "" : "s"} restantes · vence ${fmtDate(r.paid_until)}`;

  return (
    <StripeCard tone={meta.stripe} className="flex items-center gap-4 py-4 pr-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-base font-bold text-text">{r.name}</p>
          <Badge>{r.owner_name}</Badge>
        </div>
        <p className="mt-1 text-sm text-text-soft">{detail}</p>
      </div>
      <Badge tone={meta.tone}>{meta.label}</Badge>
    </StripeCard>
  );
}

export function Subscriptions() {
  const q = useSubscriptions();
  const [filter, setFilter] = useState<SubStatus | "all">("all");

  const rows = useMemo(() => {
    const all = q.data ?? [];
    const filtered = filter === "all" ? all : all.filter((r) => r.status === filter);
    const priority: Record<SubStatus, number> = { expired: 0, active: 1, none: 2, founder: 3 };
    return [...filtered].sort((a, b) => priority[a.status] - priority[b.status]);
  }, [q.data, filter]);

  const counts = useMemo(() => {
    const all = q.data ?? [];
    return {
      expired: all.filter((r) => r.status === "expired").length,
      active: all.filter((r) => r.status === "active").length,
      founder: all.filter((r) => r.status === "founder").length,
      none: all.filter((r) => r.status === "none").length,
    };
  }, [q.data]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Suscripciones"
        title="Locales"
        body="Quién es Original, quién está al día y quién debe reactivar su plan."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={AlertTriangle} label="Vencidos" value={counts.expired} tone="danger" />
        <StatTile icon={Wallet} label="Activos" value={counts.active} tone="good" />
        <StatTile icon={Crown} label="Originales" value={counts.founder} tone="brand" />
        <StatTile icon={Ban} label="Sin plan" value={counts.none} tone="neutral" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
              filter === f.key
                ? "border-brand bg-brand/10 text-brand"
                : "border-border bg-surface text-text-soft hover:text-text"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <EmptyState icon={Wallet} title="Nada aquí" body="Ningún local coincide con este filtro." />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  tone: "danger" | "good" | "brand" | "neutral";
}) {
  const toneClass = {
    danger: "text-danger bg-danger/10",
    good: "text-good bg-good/10",
    brand: "text-brand bg-brand/10",
    neutral: "text-text-soft bg-surface-2",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="font-display text-xl font-extrabold leading-none text-text">{value}</p>
        <p className="mt-1 truncate text-xs font-semibold text-text-soft">{label}</p>
      </div>
    </div>
  );
}
