import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  Banknote,
  Flag,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageSquareWarning,
  Store,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useAdminCounts } from "../lib/queries/admin";
import { Brand } from "./Brand";

const NAV: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  key?: "restaurants" | "reported" | "reviews" | "support" | "payments";
}[] = [
  { to: "/", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { to: "/restaurantes", label: "Locales pendientes", icon: Store, key: "restaurants" },
  { to: "/reportados", label: "Locales reportados", icon: Flag, key: "reported" },
  { to: "/resenas", label: "Reseñas reportadas", icon: MessageSquareWarning, key: "reviews" },
  { to: "/pagos", label: "Pagos", icon: Banknote, key: "payments" },
  { to: "/soporte", label: "Soporte", icon: LifeBuoy, key: "support" },
];

export function Layout() {
  const { profile, signOut } = useAuth();
  const countsQ = useAdminCounts();
  const counts = countsQ.data;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-[#161210] px-4 py-6">
        <div className="mb-8 flex items-center justify-between px-2">
          <Brand dark />
          <span className="rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
            Admin
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end, key }) => {
            const count = key ? counts?.[key] : undefined;
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white/85"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className="h-[18px] w-[18px] shrink-0"
                      strokeWidth={2}
                      style={{ color: isActive ? "var(--brand)" : undefined }}
                    />
                    <span className="flex-1 truncate">{label}</span>
                    {!!count && (
                      <span
                        className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold leading-none ${
                          isActive ? "bg-brand text-white" : "bg-white/10 text-white/70"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
            {(profile?.full_name ?? "A").trim().charAt(0).toUpperCase()}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">
            {profile?.full_name ?? "Admin"}
          </p>
          <button
            onClick={() => signOut()}
            title="Cerrar sesión"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
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
