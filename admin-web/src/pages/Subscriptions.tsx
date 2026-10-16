import { useMemo, useState } from "react";
import { AlertTriangle, Ban, Crown, Wallet } from "lucide-react";
import {
  daysLeft,
  useAdjustPlan,
  useSubscriptions,
  type RestaurantSubscription,
  type SubStatus,
} from "../lib/queries/subscriptions";
import { Badge, Button, EmptyState, PageHeader, PageLoading, StripeCard } from "../components/ui";

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

type Panel = null | "days" | "date" | "remove" | "boost";

function Row({ r }: { r: RestaurantSubscription }) {
  const meta = STATUS_META[r.status];
  const left = daysLeft(r.paid_until);
  const adjust = useAdjustPlan();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [days, setDays] = useState("30");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const boosted = !!r.boost_until && new Date(r.boost_until).getTime() > Date.now();
  const founder = r.status === "founder";

  let detail: string;
  if (r.status === "founder") detail = `Original #${r.founder_rank}`;
  else if (r.status === "none") detail = "Nunca tuvo plan asignado";
  else if (r.status === "expired") detail = `Venció hace ${Math.abs(left ?? 0)} día${Math.abs(left ?? 0) === 1 ? "" : "s"} · ${fmtDate(r.paid_until)}`;
  else detail = `${left} día${left === 1 ? "" : "s"} restantes · vence ${fmtDate(r.paid_until)}`;

  function close() {
    setPanel(null);
    setReason("");
    adjust.reset();
  }

  function run(input: Parameters<typeof adjust.mutate>[0]) {
    adjust.mutate(input, { onSuccess: () => close() });
  }

  const reasonField = (
    <input
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      placeholder="Motivo (opcional, queda en el historial)"
      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
    />
  );

  return (
    <StripeCard tone={meta.stripe} className="flex flex-col gap-3 py-4 pr-5">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-bold text-text">{r.name}</p>
            <Badge>{r.owner_name}</Badge>
            {boosted && <Badge tone="brand">Destacado hasta {fmtDate(r.boost_until)}</Badge>}
          </div>
          <p className="mt-1 text-sm text-text-soft">{detail}</p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
        {!founder && (
          <Button
            variant="ghost"
            onClick={() => {
              if (open) close();
              setOpen(!open);
            }}
          >
            {open ? "Cerrar" : "Gestionar"}
          </Button>
        )}
      </div>

      {open && !founder && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setPanel("days")}>Sumar días</Button>
            <Button variant="secondary" onClick={() => setPanel("date")}>Fijar vencimiento</Button>
            {boosted && <Button variant="secondary" onClick={() => setPanel("boost")}>Quitar Destacado</Button>}
            {r.status === "active" && <Button variant="danger" onClick={() => setPanel("remove")}>Quitar plan</Button>}
          </div>

          {panel === "days" && (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-text-soft">
                Días de cortesía (se suman al vencimiento, o desde hoy si ya venció)
                <input
                  value={days}
                  onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                />
              </label>
              {reasonField}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close}>Cancelar</Button>
                <Button
                  loading={adjust.isPending}
                  disabled={!Number(days)}
                  onClick={() => run({ restaurantId: r.id, action: "add_days", days: Number(days), reason: reason.trim() || undefined })}
                >
                  Sumar {Number(days) || 0} días
                </Button>
              </div>
            </div>
          )}

          {panel === "date" && (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-text-soft">
                Nuevo vencimiento
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-48 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                />
              </label>
              {reasonField}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close}>Cancelar</Button>
                <Button
                  loading={adjust.isPending}
                  disabled={!date}
                  onClick={() =>
                    run({ restaurantId: r.id, action: "set_date", date: new Date(`${date}T23:59:59-04:00`).toISOString(), reason: reason.trim() || undefined })
                  }
                >
                  Fijar fecha
                </Button>
              </div>
            </div>
          )}

          {panel === "remove" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-soft">
                El local pasa a perfil básico ahora mismo: sigue en el mapa pero sin contacto, menú ni fotos. Los pagos registrados no se tocan.
              </p>
              {reasonField}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close}>Cancelar</Button>
                <Button variant="danger" loading={adjust.isPending} onClick={() => run({ restaurantId: r.id, action: "remove", reason: reason.trim() || undefined })}>
                  Quitar plan
                </Button>
              </div>
            </div>
          )}

          {panel === "boost" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-soft">Se quita el Destacado ahora mismo. El plan no cambia.</p>
              {reasonField}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close}>Cancelar</Button>
                <Button variant="danger" loading={adjust.isPending} onClick={() => run({ restaurantId: r.id, action: "remove_boost", reason: reason.trim() || undefined })}>
                  Quitar Destacado
                </Button>
              </div>
            </div>
          )}

          {adjust.isError && (
            <p className="text-sm text-danger" role="alert">
              {(adjust.error as Error).message}
            </p>
          )}
        </div>
      )}
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
