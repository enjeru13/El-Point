import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Banknote,
  CreditCard,
  Flag,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquareWarning,
  Store,
  X,
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
  key?: "restaurants" | "reported" | "reviews" | "support" | "payments" | "expiredSubs";
}[] = [
  { to: "/", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { to: "/restaurantes", label: "Locales pendientes", icon: Store, key: "restaurants" },
  { to: "/reportados", label: "Locales reportados", icon: Flag, key: "reported" },
  { to: "/resenas", label: "Reseñas reportadas", icon: MessageSquareWarning, key: "reviews" },
  { to: "/pagos", label: "Pagos", icon: Banknote, key: "payments" },
  { to: "/suscripciones", label: "Suscripciones", icon: CreditCard, key: "expiredSubs" },
  { to: "/soporte", label: "Soporte", icon: LifeBuoy, key: "support" },
];

function AdminBadge() {
  return (
    <span className="rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
      Admin
    </span>
  );
}

/** Contenido del menú lateral; sirve igual para la barra fija (escritorio) y el cajón (móvil). */
function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { profile, signOut } = useAuth();
  const countsQ = useAdminCounts();
  const counts = countsQ.data;

  return (
    <>
      <div className="mb-8 flex items-center justify-between px-2">
        <Brand dark />
        {onClose ? (
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        ) : (
          <AdminBadge />
        )}
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
          aria-label="Cerrar sesión"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const countsQ = useAdminCounts();
  const pending = countsQ.data
    ? countsQ.data.restaurants + countsQ.data.reported + countsQ.data.reviews + countsQ.data.support + countsQ.data.payments
    : 0;

  // El cajón se cierra al navegar y con Esc; con él abierto no se desplaza la página.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="min-h-screen lg:flex">
      {/* Escritorio: barra lateral fija */}
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto bg-[#161210] px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <SidebarContent />
      </aside>

      {/* Móvil / tablet: barra superior + cajón */}
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-[#161210] px-4 py-3 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
          {pending > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />}
        </button>
        <div className="flex flex-1 justify-center">
          <Brand dark size="sm" align="center" />
        </div>
        <AdminBadge />
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-[#161210] px-4 py-6 shadow-2xl">
            <SidebarContent onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 bg-bg">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
