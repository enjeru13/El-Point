import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useAdminCounts, type AdminCounts } from "../lib/queries/admin";
import { useGrowthStats, useTotals, type WeekPoint } from "../lib/queries/stats";
import { PageLoading } from "../components/ui";
import { Delta } from "../components/charts";

type QueueKey = keyof AdminCounts;

const QUEUES: { to: string; key: QueueKey; title: string; body: string; action: string }[] = [
  { to: "/pagos", key: "payments", title: "Pagos por verificar", body: "Comprobantes esperando que los confirmes.", action: "Verificar" },
  { to: "/restaurantes", key: "restaurants", title: "Locales pendientes", body: "Esperando tu aprobación para salir en la app.", action: "Revisar" },
  { to: "/soporte", key: "support", title: "Soporte abierto", body: "Mensajes de usuarios sin responder.", action: "Responder" },
  { to: "/resenas", key: "reviews", title: "Reseñas reportadas", body: "Alguien las marcó como problemáticas.", action: "Moderar" },
  { to: "/reportados", key: "reported", title: "Locales suspendidos", body: "Suspendidos por reportes o por el equipo.", action: "Revisar" },
  { to: "/locales?plan=expired", key: "expiredSubs", title: "Planes vencidos", body: "Locales con perfil básico: avísales para renovar.", action: "Ver" },
];

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

function Kpi({ label, value, now, before }: { label: string; value: string; now?: number; before?: number }) {
  return (
    <Link to="/estadisticas" className="group min-w-0 border-t border-border pt-3 transition-colors hover:border-text-soft">
      <p className="truncate text-xs font-medium text-text-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-text">{value}</p>
      <div className="mt-0.5 text-xs">
        {now !== undefined && before !== undefined ? <Delta now={now} before={before} /> : <span className="text-text-soft">Promedio de todas las reseñas</span>}
      </div>
    </Link>
  );
}

export function Dashboard() {
  const { profile } = useAuth();
  const countsQ = useAdminCounts();
  const totalsQ = useTotals();
  // 8 semanas atrás vs las 8 anteriores, para la tendencia de cada número.
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
    now: sumOf(g.slice(half), pick),
    before: sumOf(g.slice(0, half), pick),
  });

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {greeting()}, {firstName ?? "admin"}
        </h1>
        <p className="mt-1 text-sm text-text-soft">
          {countsQ.isLoading
            ? "Cargando…"
            : totalPending === 0
              ? "Todo al día. Nada esperando tu revisión."
              : `${totalPending} ${totalPending === 1 ? "cosa necesita" : "cosas necesitan"} tu atención.`}
        </p>
      </div>

      <section aria-label="Números clave" className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
        <Kpi label="Usuarios" value={String(t?.users ?? 0)} {...trend((w) => w.new_users)} />
        <Kpi label="Locales" value={String(t?.restaurantsApproved ?? 0)} {...trend((w) => w.new_restaurants)} />
        <Kpi label="Reseñas" value={String(t?.reviews ?? 0)} {...trend((w) => w.new_reviews)} />
        <Kpi label="Calificación" value={t?.avgRating ? t.avgRating.toFixed(2) : "—"} />
      </section>

      <section aria-label="Pendientes" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Necesita tu atención</h2>

        {countsQ.isLoading ? (
          <PageLoading />
        ) : pending.length === 0 ? (
          <p className="border-y border-border py-6 text-sm text-text-soft">
            No hay pagos, locales, reseñas ni mensajes esperando respuesta.
          </p>
        ) : (
          <div className="divide-y divide-border/60 border-y border-border">
            {pending.map((q) => (
              <Link key={q.to} to={q.to} className="group flex items-center gap-4 px-1 py-3.5 transition-colors hover:bg-surface-2/60 sm:px-3">
                <span className="w-8 shrink-0 text-lg font-semibold tabular-nums text-brand">{counts?.[q.key] ?? 0}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text">{q.title}</p>
                  <p className="truncate text-xs text-text-soft">{q.body}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-text-soft transition-transform group-hover:translate-x-0.5 group-hover:text-text" strokeWidth={1.75} />
              </Link>
            ))}
          </div>
        )}

        {!countsQ.isLoading && clear.length > 0 && pending.length > 0 && (
          <p className="text-sm text-text-soft">
            Al día:{" "}
            {clear.map((q, i) => (
              <span key={q.to}>
                <Link to={q.to} className="text-text hover:text-brand">
                  {q.title.toLowerCase()}
                </Link>
                {i < clear.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        )}
      </section>
    </div>
  );
}
