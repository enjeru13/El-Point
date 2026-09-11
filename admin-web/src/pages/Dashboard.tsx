import { Link } from "react-router-dom";
import { ArrowRight, Banknote, BarChart3, Flag, LifeBuoy, MessageSquareWarning, Store, type LucideIcon } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useAdminCounts } from "../lib/queries/admin";
import { PageHeader, PageLoading } from "../components/ui";

const TILES: {
  to: string;
  key: "restaurants" | "reported" | "reviews" | "support" | "payments";
  icon: LucideIcon;
  title: string;
  body: string;
}[] = [
  {
    to: "/restaurantes",
    key: "restaurants",
    icon: Store,
    title: "Locales pendientes",
    body: "Esperando revisión antes de aparecer en la app.",
  },
  {
    to: "/reportados",
    key: "reported",
    icon: Flag,
    title: "Locales reportados",
    body: "Suspendidos por reportes de comensales.",
  },
  {
    to: "/resenas",
    key: "reviews",
    icon: MessageSquareWarning,
    title: "Reseñas reportadas",
    body: "Reseñas que alguien marcó como problemáticas.",
  },
  {
    to: "/pagos",
    key: "payments",
    icon: Banknote,
    title: "Pagos pendientes",
    body: "Comprobantes de suscripción esperando verificación.",
  },
  {
    to: "/soporte",
    key: "support",
    icon: LifeBuoy,
    title: "Soporte abierto",
    body: "Mensajes de usuarios sin responder.",
  },
];

export function Dashboard() {
  const { profile } = useAuth();
  const countsQ = useAdminCounts();

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const totalPending = TILES.reduce((sum, t) => sum + (countsQ.data?.[t.key] ?? 0), 0);

  return (
    <div className="flex flex-col gap-9">
      <PageHeader
        eyebrow="Resumen"
        title={`Hola, ${firstName ?? "admin"}`}
        body={
          countsQ.isLoading
            ? "Cargando…"
            : totalPending === 0
              ? "Todo al día — nada esperando tu revisión."
              : `${totalPending} ${totalPending === 1 ? "cosa necesita" : "cosas necesitan"} tu atención.`
        }
      />

      <Link
        to="/estadisticas"
        className="group flex items-center gap-4 rounded-2xl border border-border bg-surface-2 p-4 transition hover:border-brand/40"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
          <BarChart3 className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-text">Ver estadísticas de crecimiento</p>
          <p className="text-xs text-text-soft">Usuarios, locales y reseñas nuevas por semana.</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-text-soft transition group-hover:translate-x-0.5 group-hover:text-brand" strokeWidth={2} />
      </Link>

      {countsQ.isLoading ? (
        <PageLoading />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TILES.map((t) => {
            const n = countsQ.data?.[t.key] ?? 0;
            const hot = n > 0;
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.07),0_16px_32px_rgba(0,0,0,0.08)]"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${hot ? "bg-brand" : "bg-transparent"}`}
                  aria-hidden
                />
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      hot ? "bg-brand/12 text-brand" : "bg-surface-2 text-text-soft"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="font-display text-base font-bold text-text">{t.title}</p>
                    <p className="mt-0.5 text-sm leading-snug text-text-soft">{t.body}</p>
                  </div>
                  <p
                    className={`shrink-0 font-display text-3xl font-extrabold tabular-nums ${
                      hot ? "text-brand" : "text-border"
                    }`}
                  >
                    {n}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
