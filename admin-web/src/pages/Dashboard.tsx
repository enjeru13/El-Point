import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useAdminCounts } from "../lib/queries/admin";
import { Card, PageLoading } from "../components/ui";

const TILES = [
  {
    to: "/restaurantes",
    key: "restaurants" as const,
    icon: "🏪",
    title: "Locales pendientes",
    body: "Esperando revisión antes de aparecer en la app.",
  },
  {
    to: "/reportados",
    key: "reported" as const,
    icon: "🚩",
    title: "Locales reportados",
    body: "Suspendidos por reportes de comensales.",
  },
  {
    to: "/resenas",
    key: "reviews" as const,
    icon: "💬",
    title: "Reseñas reportadas",
    body: "Reseñas que alguien marcó como problemáticas.",
  },
  {
    to: "/soporte",
    key: "support" as const,
    icon: "🛟",
    title: "Soporte abierto",
    body: "Mensajes de usuarios sin responder.",
  },
];

export function Dashboard() {
  const { profile } = useAuth();
  const countsQ = useAdminCounts();

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Hola, {firstName ?? "admin"} 👋</h1>
        <p className="mt-1 text-text-soft">Esto es lo que necesita tu atención ahora mismo.</p>
      </div>

      {countsQ.isLoading ? (
        <PageLoading />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TILES.map((t) => {
            const n = countsQ.data?.[t.key] ?? 0;
            return (
              <Link key={t.to} to={t.to}>
                <Card className="flex h-full items-center gap-4 p-5 transition hover:border-brand/50 hover:shadow-md">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-2xl">
                    {t.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold text-text">{t.title}</p>
                    <p className="truncate text-sm text-text-soft">{t.body}</p>
                  </div>
                  <div
                    className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-bold ${
                      n > 0 ? "bg-brand text-white" : "bg-surface-2 text-text-soft"
                    }`}
                  >
                    {n}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
