import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Banknote,
  ClipboardCheck,
  Flag,
  Building2,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquareWarning,
  Search,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useAdminCounts } from "../lib/queries/admin";
import { Brand } from "./Brand";
import { CommandPalette } from "./CommandPalette";

const NAV: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Título del grupo; se muestra encima de este ítem. */
  section?: string;
  key?: "restaurants" | "reported" | "reviews" | "support" | "payments" | "expiredSubs";
}[] = [
  { to: "/", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { to: "/locales", label: "Locales", icon: Building2, key: "expiredSubs", section: "Negocio" },
  { to: "/pagos", label: "Pagos", icon: Banknote, key: "payments" },
  { to: "/restaurantes", label: "Locales pendientes", icon: ClipboardCheck, key: "restaurants", section: "Moderación" },
  { to: "/reportados", label: "Suspendidos", icon: Flag, key: "reported" },
  { to: "/resenas", label: "Reseñas reportadas", icon: MessageSquareWarning, key: "reviews" },
  { to: "/usuarios", label: "Usuarios", icon: Users },
  { to: "/soporte", label: "Soporte", icon: LifeBuoy, key: "support" },
];

/** Contenido del menú lateral; sirve igual para la barra fija (escritorio) y el cajón (móvil). */
function SidebarContent({ onClose, onSearch }: { onClose?: () => void; onSearch: () => void }) {
  const { profile, signOut } = useAuth();
  const countsQ = useAdminCounts();
  const counts = countsQ.data;

  return (
    <>
      <div className="mb-6 flex items-center justify-between px-2">
        <Brand />
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-soft transition-colors hover:bg-surface-2 hover:text-text"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <button
        onClick={onSearch}
        className="mb-4 flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm text-text-soft transition-colors hover:text-text"
      >
        <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="flex-1 text-left">Buscar</span>
        <kbd className="text-[11px] font-medium text-text-soft">Ctrl K</kbd>
      </button>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon, end, key, section }) => {
          const count = key ? counts?.[key] : undefined;
          return (
            <div key={to} className="flex flex-col">
              {section && <p className="mb-1 mt-5 px-2.5 text-xs font-medium text-text-soft/70">{section}</p>}
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-surface-2 text-text" : "text-text-soft hover:bg-surface-2/60 hover:text-text"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="flex-1 truncate">{label}</span>
                {!!count && <span className="text-xs font-semibold tabular-nums text-brand">{count}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center gap-2 border-t border-border px-2.5 pt-4">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-text">{profile?.full_name ?? "Admin"}</p>
        <button
          onClick={() => signOut()}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-soft transition-colors hover:bg-surface-2 hover:text-text"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
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
      <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-bg px-3 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <SidebarContent onSearch={() => setSearching(true)} />
      </aside>

      {/* Móvil / tablet: barra superior + cajón */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg px-4 py-2.5 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-text transition-colors hover:bg-surface-2"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
          {pending > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />}
        </button>
        <div className="flex flex-1 justify-center">
          <Brand size="sm" align="center" />
        </div>
        <button onClick={() => setSearching(true)} aria-label="Buscar" className="flex h-9 w-9 items-center justify-center rounded-md text-text transition-colors hover:bg-surface-2">
          <Search className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto border-r border-border bg-bg px-3 py-5">
            <SidebarContent
              onClose={() => setOpen(false)}
              onSearch={() => {
                setOpen(false);
                setSearching(true);
              }}
            />
          </aside>
        </div>
      )}

      <CommandPalette open={searching} onClose={() => setSearching(false)} />

      <main className="min-w-0 flex-1 bg-bg">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
