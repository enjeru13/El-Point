import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useAdminCounts } from "../lib/queries/admin";

const NAV = [
  { to: "/", label: "Resumen", icon: "🏠", end: true },
  { to: "/restaurantes", label: "Locales pendientes", icon: "🏪", key: "restaurants" as const },
  { to: "/reportados", label: "Locales reportados", icon: "🚩", key: "reported" as const },
  { to: "/resenas", label: "Reseñas reportadas", icon: "💬", key: "reviews" as const },
  { to: "/soporte", label: "Soporte", icon: "🛟", key: "support" as const },
];

export function Layout() {
  const { profile, signOut } = useAuth();
  const countsQ = useAdminCounts();
  const counts = countsQ.data;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-black text-white">
            P
          </div>
          <div>
            <p className="font-display text-sm font-bold leading-none text-text">El Point</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">Admin</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const count = item.key ? counts?.[item.key] : undefined;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive ? "bg-brand text-white" : "text-text-soft hover:bg-surface-2 hover:text-text"
                  }`
                }
              >
                <span aria-hidden>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {!!count && (
                  <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-xs font-bold">
                    {count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-border pt-4">
          <p className="truncate px-2 text-sm font-semibold text-text">{profile?.full_name ?? "Admin"}</p>
          <button
            onClick={() => signOut()}
            className="mt-1 px-2 text-xs font-semibold text-text-soft hover:text-danger"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-bg">
        <div className="mx-auto max-w-5xl px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
