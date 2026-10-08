import { Link } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Flag,
  LifeBuoy,
  MessageSquareWarning,
  Star,
  Store,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useAdminCounts, type AdminCounts } from "../lib/queries/admin";
import { useGrowthStats, useTotals, type WeekPoint } from "../lib/queries/stats";
import { Card, PageLoading } from "../components/ui";
import { Delta, Sparkline } from "../components/charts";

type QueueKey = keyof AdminCounts;

const QUEUES: { to: string; key: QueueKey; icon: LucideIcon; title: string; body: string; action: string }[] = [
  { to: "/pagos", key: "payments", icon: Banknote, title: "Pagos por verificar", body: "Comprobantes esperando que los confirmes.", action: "Verificar" },
  { to: "/restaurantes", key: "restaurants", icon: Store, title: "Locales pendientes", body: "Esperando tu aprobación para salir en la app.", action: "Revisar" },
  { to: "/soporte", key: "support", icon: LifeBuoy, title: "Soporte abierto", body: "Mensajes de usuarios sin responder.", action: "Responder" },
  { to: "/resenas", key: "reviews", icon: MessageSquareWarning, title: "Reseñas reportadas", body: "Alguien las marcó como problemáticas.", action: "Moderar" },
  { to: "/reportados", key: "reported", icon: Flag, title: "Locales reportados", body: "Suspendidos por reportes de comensales.", action: "Revisar" },
  { to: "/suscripciones", key: "expiredSubs", icon: CreditCard, title: "Suscripciones vencidas", body: "Locales aprobados con el plan vencido.", action: "Ver" },
];

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

function Kpi({
  icon: Icon,
  label,
  value,
  color,
  values,
  now,
  before,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
  values?: number[];
  now?: number;
  before?: number;
}) {
  return (
    <Link
      to="/estadisticas"
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition hover:border-text-soft/40"
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-text-soft">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="font-display text-4xl font-extrabold leading-none tabular-nums text-text">{value}</p>
        {values && (
          <div className="w-20 shrink-0">
            <Sparkline values={values} color={color} />
          </div>
        )}
      </div>
      {now !== undefined && before !== undefined ? (
        <Delta now={now} before={before} />
      ) : (
        <span className="text-xs text-text-soft">Promedio de todas las reseñas</span>
      )}
    </Link>
  );
}

export function Dashboard() {
  const { profile } = useAuth();
  const countsQ = useAdminCounts();
  const totalsQ = useTotals();
  // 8 semanas atrás vs las 8 anteriores, para la tendencia de cada tarjeta.
  const growthQ = useGrowthStats(8);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const counts = countsQ.data;
  const pending = QUEUES.filter((q) => (counts?.[q.key] ?? 0) > 0);
  const clear = QUEUES.filter((q) => (counts?.[q.key] ?? 0) === 0);
  const totalPending = pending.reduce((sum, q) => sum + (counts?.[q.key] ?? 0), 0);

  const t = totalsQ.data;
  const g: WeekPoint[] = growthQ.data ?? [];
  const half = Math.floor(g.length / 2);
  const sumOf = (rows: WeekPoint[], pick: (w: WeekPoint) => number) => rows.reduce((a, w) => a + pick(w), 0);
  const trend = (pick: (w: WeekPoint) => number) => ({
    values: g.map(pick),
    now: sumOf(g.slice(half), pick),
    before: sumOf(g.slice(0, half), pick),
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-brand">
          {new Date().toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
          {greeting()}, {firstName ?? "admin"}
        </h1>
        <p className="mt-1.5 text-text-soft">
          {countsQ.isLoading
            ? "Cargando…"
            : totalPending === 0
              ? "Todo al día. Nada esperando tu revisión."
              : `${totalPending} ${totalPending === 1 ? "cosa necesita" : "cosas necesitan"} tu atención.`}
        </p>
      </div>

      <section aria-label="Números clave" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Users} label="Usuarios" value={String(t?.users ?? 0)} color="var(--brand)" {...trend((w) => w.new_users)} />
        <Kpi icon={Store} label="Locales" value={String(t?.restaurantsApproved ?? 0)} color="var(--good)" {...trend((w) => w.new_restaurants)} />
        <Kpi icon={TrendingUp} label="Reseñas" value={String(t?.reviews ?? 0)} color="var(--gold)" {...trend((w) => w.new_reviews)} />
        <Kpi icon={Star} label="Calificación" value={t?.avgRating ? t.avgRating.toFixed(2) : "—"} color="var(--gold)" />
      </section>

      <section aria-label="Pendientes" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold text-text">Necesita tu atención</h2>
          <Link to="/estadisticas" className="text-sm font-semibold text-brand hover:underline">
            Ver estadísticas
          </Link>
        </div>

        {countsQ.isLoading ? (
          <PageLoading />
        ) : pending.length === 0 ? (
          <Card className="flex items-center gap-4 p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-good/12 text-good">
              <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
            </span>
            <div>
              <p className="font-display text-base font-bold text-text">Todo al día</p>
              <p className="text-sm text-text-soft">No hay pagos, locales, reseñas ni mensajes esperando respuesta.</p>
            </div>
          </Card>
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {pending.map((q) => {
              const Icon = q.icon;
              const n = counts?.[q.key] ?? 0;
              return (
                <Link key={q.to} to={q.to} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-surface-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-bold text-text">{q.title}</p>
                    <p className="truncate text-sm text-text-soft">{q.body}</p>
                  </div>
                  <span className="rounded-full bg-brand px-3 py-1 font-display text-base font-extrabold tabular-nums text-white">{n}</span>
                  <span className="hidden items-center gap-1 text-sm font-semibold text-brand sm:inline-flex">
                    {q.action}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" strokeWidth={2} />
                  </span>
                </Link>
              );
            })}
          </Card>
        )}

        {!countsQ.isLoading && clear.length > 0 && pending.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-soft">
            <CheckCircle2 className="h-4 w-4 text-good" strokeWidth={2} />
            Al día:
            {clear.map((q, i) => (
              <Link key={q.to} to={q.to} className="font-semibold text-text hover:text-brand">
                {q.title.toLowerCase()}
                {i < clear.length - 1 ? "," : ""}
              </Link>
            ))}
          </p>
        )}
      </section>
    </div>
  );
}
