import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CornerDownLeft, Search, User, type LucideIcon } from "lucide-react";
import { useAllLocales, STATUS_LABEL } from "../lib/queries/locales";
import { useUserDirectory } from "../lib/queries/users";

type Item = { id: string; label: string; hint?: string; group: string; icon: LucideIcon; to: string };

export const PAGES: { to: string; label: string; words: string }[] = [
  { to: "/", label: "Resumen", words: "inicio dashboard" },
  { to: "/estadisticas", label: "Estadísticas", words: "metricas numeros" },
  { to: "/locales", label: "Locales", words: "restaurantes planes" },
  { to: "/pagos", label: "Pagos", words: "comprobantes verificar" },
  { to: "/restaurantes", label: "Locales pendientes", words: "verificar aprobar cola" },
  { to: "/reportados", label: "Suspendidos", words: "reportados locales" },
  { to: "/resenas", label: "Reseñas reportadas", words: "moderacion resenas" },
  { to: "/usuarios", label: "Usuarios", words: "directorio ban suspender strikes" },
  { to: "/usuarios?tab=bloqueos", label: "Bloqueos entre usuarios", words: "bloqueados" },
  { to: "/usuarios?tab=eliminadas", label: "Cuentas eliminadas", words: "borradas bajas" },
  { to: "/soporte", label: "Soporte", words: "mensajes tickets ayuda" },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Salta a cualquier página, local o usuario sin tocar el menú. Ctrl/⌘+K lo abre. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <Palette onClose={onClose} /> : null;
}

function Palette({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const term = norm(q.trim());

  const locales = useAllLocales();
  const users = useUserDirectory({ search: q, filter: "all", page: 0 });

  useEffect(() => inputRef.current?.focus(), []);

  const items = useMemo<Item[]>(() => {
    const pages: Item[] = PAGES.filter((p) => !term || norm(`${p.label} ${p.words}`).includes(term)).map((p) => ({
      id: p.to, label: p.label, group: "Ir a", icon: Search, to: p.to,
    }));
    const locs: Item[] = term
      ? (locales.data ?? [])
          .filter((l) => norm(`${l.name} ${l.owner_name}`).includes(term))
          .slice(0, 5)
          .map((l) => ({ id: l.id, label: l.name, hint: STATUS_LABEL[l.status], group: "Locales", icon: Building2, to: `/locales/${l.id}` }))
      : [];
    const usrs: Item[] = term
      ? (users.data?.rows ?? []).slice(0, 5).map((u) => ({
          id: u.id,
          label: u.username ? `@${u.username}` : (u.full_name ?? "Sin nombre"),
          hint: u.banned_at ? "Suspendido" : u.full_name ?? undefined,
          group: "Usuarios",
          icon: User,
          to: `/usuarios?q=${encodeURIComponent(u.username ?? u.full_name ?? "")}`,
        }))
      : [];
    return [...locs, ...usrs, ...pages];
  }, [term, locales.data, users.data]);

  useEffect(() => setActive(0), [term]);

  function go(item: Item | undefined) {
    if (!item) return;
    onClose();
    nav(item.to);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") go(items[active]);
  }

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Buscar en el panel">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-text-soft" strokeWidth={2} aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca un local, un usuario o una página"
            aria-label="Buscar"
            className="h-12 w-full bg-transparent text-sm text-text outline-none placeholder:text-text-soft"
          />
          <kbd className="rounded border border-border bg-surface-2 px-1.5 text-[11px] font-semibold text-text-soft">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-text-soft">Nada coincide con “{q}”.</li>}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            const Icon = it.icon;
            return (
              <li key={`${it.group}-${it.id}`} role="presentation">
                {header && <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-soft">{header}</p>}
                <button
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(it)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                    i === active ? "bg-brand/10 text-text" : "text-text-soft"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-semibold text-text">{it.label}</span>
                  {it.hint && <span className="shrink-0 text-xs text-text-soft">{it.hint}</span>}
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-text-soft" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
