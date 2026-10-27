import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import {
  PAGE_SIZE,
  useDeletedAccounts,
  useMostBlocked,
  useRecentBlocks,
  useSetUserStatus,
  useUserDirectory,
  type DirectoryUser,
  type UserAction,
  type UserFilter,
} from "../lib/queries/users";
import { fmtDate } from "../lib/format";
import { Badge, Button, EmptyState, INPUT, PageHeader, PageLoading, Segmented, Tabs, timeAgo } from "../components/ui";

type Tab = "directorio" | "bloqueos" | "eliminadas";

const ROLE_LABEL: Record<string, string> = { customer: "Comensal", restaurant_owner: "Dueño" };

const FILTERS: { value: UserFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "banned", label: "Suspendidos" },
  { value: "strikes", label: "Con strikes" },
  { value: "blocked", label: "Bloqueados" },
  { value: "owners", label: "Dueños" },
];

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function displayName(u: { username: string | null; full_name: string | null }) {
  return u.username ? `@${u.username}` : (u.full_name ?? "Sin nombre");
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ─── Directorio ──────────────────────────────────────────────────────────────

const COLS = "sm:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.4fr)]";

const ACTION_COPY: Record<UserAction, { body: string; cta: string; danger?: boolean }> = {
  ban: {
    body: "Pierde el acceso a la app de inmediato. Puedes reactivarla cuando quieras.",
    cta: "Suspender",
    danger: true,
  },
  unban: { body: "Vuelve a entrar a la app con normalidad. Los strikes no se borran.", cta: "Reactivar" },
  clear_strikes: { body: "Los strikes vuelven a cero. Úsalo si fue un error o ya pasó tiempo prudente.", cta: "Limpiar strikes" },
};

function UserActions({ u }: { u: DirectoryUser }) {
  const set = useSetUserStatus();
  const [action, setAction] = useState<UserAction | null>(null);
  const [note, setNote] = useState("");

  function close() {
    setAction(null);
    setNote("");
    set.reset();
  }
  function run() {
    if (!action) return;
    set.mutate({ userId: u.id, action, note: note.trim() || undefined }, { onSuccess: close });
  }

  const copy = action ? ACTION_COPY[action] : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {u.banned_at ? (
          <Button variant="secondary" onClick={() => setAction("unban")}>
            Reactivar cuenta
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setAction("ban")}>
            Suspender cuenta
          </Button>
        )}
        {u.strikes > 0 && (
          <Button variant="secondary" onClick={() => setAction("clear_strikes")}>
            Limpiar strikes
          </Button>
        )}
      </div>

      {copy && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-soft">{copy.body}</p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo (opcional, queda en el historial)"
            className={INPUT}
            aria-label="Motivo"
          />
          <div className="flex gap-2">
            <Button variant={copy.danger ? "danger" : "primary"} loading={set.isPending} onClick={run}>
              {copy.cta}
            </Button>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
          </div>
          {set.isError && (
            <p className="text-sm text-danger" role="alert">
              {(set.error as Error).message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function UserRow({ u, open, onToggle }: { u: DirectoryUser; open: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-1 py-3 text-left transition-colors hover:bg-surface-2/60 sm:px-3 ${COLS}`}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{displayName(u)}</p>
          <p className="truncate text-xs text-text-soft">{u.full_name && u.username ? u.full_name : (u.email ?? "")}</p>
        </div>
        <p className="hidden text-sm text-text-soft sm:block">
          {ROLE_LABEL[u.role] ?? u.role}
          <span className="block text-xs">Nivel {u.level}</span>
        </p>
        <p className="hidden text-sm text-text-soft sm:block">
          {plural(u.reviews_count, "reseña", "reseñas")}
          {u.restaurants_count > 0 && <span className="block text-xs">{plural(u.restaurants_count, "local", "locales")}</span>}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:justify-start">
          {u.banned_at && <Badge tone="danger">Suspendido</Badge>}
          {u.strikes > 0 && <Badge tone="warn">{plural(u.strikes, "strike", "strikes")}</Badge>}
          {u.blocked_by_count > 0 && <Badge>Bloqueado por {u.blocked_by_count}</Badge>}
        </div>
      </button>

      {open && (
        <div className="grid gap-6 border-t border-border/60 px-1 py-4 sm:grid-cols-2 sm:px-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-text-soft">Correo</dt>
            <dd className="min-w-0 truncate text-text">{u.email ?? "—"}</dd>
            <dt className="text-text-soft">Registro</dt>
            <dd className="text-text">{fmtDate(u.created_at)}</dd>
            <dt className="text-text-soft">XP</dt>
            <dd className="text-text tabular-nums">{u.xp.toLocaleString("es-VE")}</dd>
            {u.banned_at && (
              <>
                <dt className="text-text-soft">Suspendido</dt>
                <dd className="text-danger">{timeAgo(u.banned_at)}</dd>
              </>
            )}
          </dl>
          <UserActions u={u} />
        </div>
      )}
    </div>
  );
}

function Directory({ jump }: { jump: string }) {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const filter = (params.get("filtro") ?? "all") as UserFilter;
  const page = Math.max(0, Number(params.get("p") ?? 0) || 0);
  const [text, setText] = useState(urlQ);
  const debounced = useDebounced(text);
  const [openId, setOpenId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Un salto desde otra pestaña o desde el buscador global reemplaza la búsqueda.
  useEffect(() => setText(urlQ), [urlQ, jump]);

  useEffect(() => {
    if (debounced === urlQ) return;
    const next = new URLSearchParams(params);
    if (debounced) next.set("q", debounced);
    else next.delete("q");
    next.delete("p");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "all" || value === "0") next.delete(key);
    else next.set(key, value);
    if (key !== "p") next.delete("p");
    setParams(next, { replace: true });
    setOpenId(null);
  }

  const q = useUserDirectory({ search: urlQ, filter, page });
  const rows = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented label="Filtrar usuarios" value={filter} onChange={(v) => setParam("filtro", v)} options={FILTERS} />
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Buscar usuario, nombre o correo"
            aria-label="Buscar usuarios"
            className={`${INPUT} pl-8 pr-8`}
          />
          {text && (
            <button
              onClick={() => setText("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-text-soft hover:text-text"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {q.isLoading ? (
        <PageLoading />
      ) : q.isError ? (
        <p className="text-sm text-danger" role="alert">
          No se pudo cargar el directorio: {(q.error as Error).message}
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nadie coincide"
          body={urlQ || filter !== "all" ? "Prueba con otra búsqueda o quita el filtro." : "Aún no hay usuarios registrados."}
        />
      ) : (
        <div className={`transition-opacity ${q.isFetching ? "opacity-60" : ""}`}>
          <div className={`hidden grid-cols-1 gap-x-4 border-b border-border px-3 pb-2 text-xs font-medium text-text-soft sm:grid ${COLS}`}>
            <span>Usuario</span>
            <span>Rol</span>
            <span>Actividad</span>
            <span>Estado</span>
          </div>
          <div className="divide-y divide-border/60">
            {rows.map((u) => (
              <UserRow key={u.id} u={u} open={openId === u.id} onToggle={() => setOpenId(openId === u.id ? null : u.id)} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border px-1 pt-3 text-xs text-text-soft sm:px-3">
            <p className="tabular-nums">
              {from}–{to} de {total.toLocaleString("es-VE")}
            </p>
            <div className="flex items-center">
              <button
                onClick={() => setParam("p", String(page - 1))}
                disabled={page === 0}
                aria-label="Página anterior"
                className="flex h-8 w-8 items-center justify-center rounded-md transition-colors enabled:hover:bg-surface-2 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setParam("p", String(page + 1))}
                disabled={to >= total}
                aria-label="Página siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-md transition-colors enabled:hover:bg-surface-2 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bloqueos ────────────────────────────────────────────────────────────────

function Blocks({ onOpenUser }: { onOpenUser: (username: string) => void }) {
  const most = useMostBlocked();
  const recent = useRecentBlocks();

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Más bloqueados</h2>
        {most.isLoading ? (
          <PageLoading />
        ) : !most.data?.length ? (
          <EmptyState title="Nadie ha sido bloqueado" body="Cuando los usuarios se bloqueen entre sí, aquí verás a quién más." />
        ) : (
          <div className="divide-y divide-border/60 border-y border-border">
            {most.data.map((m) => (
              <button
                key={m.user_id}
                onClick={() => m.username && onOpenUser(m.username)}
                className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-surface-2/60 sm:px-3"
              >
                <span className="w-8 shrink-0 text-lg font-semibold tabular-nums text-text">{m.blocked_by_count}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text">{displayName(m)}</span>
                  <span className="block text-xs text-text-soft">Último bloqueo {timeAgo(m.last_blocked_at)}</span>
                </span>
                <span className="flex gap-1.5">
                  {m.banned_at && <Badge tone="danger">Suspendido</Badge>}
                  {m.strikes > 0 && <Badge tone="warn">{plural(m.strikes, "strike", "strikes")}</Badge>}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Recientes</h2>
        {recent.isLoading ? (
          <PageLoading />
        ) : !recent.data?.length ? (
          <EmptyState title="Sin bloqueos todavía" />
        ) : (
          <ul className="divide-y divide-border/60 border-y border-border">
            {recent.data.map((b) => (
              <li key={`${b.blocker_id}-${b.blocked_id}`} className="flex items-baseline justify-between gap-3 px-1 py-2.5 text-sm sm:px-3">
                <p className="min-w-0 truncate text-text-soft">
                  <span className="text-text">{b.blocker_username ? `@${b.blocker_username}` : "Cuenta eliminada"}</span>
                  {" bloqueó a "}
                  <span className="text-text">{b.blocked_username ? `@${b.blocked_username}` : "cuenta eliminada"}</span>
                </p>
                <span className="shrink-0 text-xs text-text-soft">{timeAgo(b.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ─── Eliminadas ──────────────────────────────────────────────────────────────

function lifespan(from: string | null, to: string): string {
  if (!from) return "—";
  const d = Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000));
  if (d < 1) return "menos de un día";
  if (d < 30) return plural(d, "día", "días");
  return plural(Math.floor(d / 30), "mes", "meses");
}

const DEL_COLS = "sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]";

function Deleted() {
  const q = useDeletedAccounts();
  const rows = q.data ?? [];
  const head = rows[0];

  if (q.isLoading) return <PageLoading />;
  if (!rows.length) {
    return (
      <EmptyState
        title="Nadie ha eliminado su cuenta"
        body="Cuando alguien la elimine desde la app, queda aquí un registro mínimo: usuario, fechas y conteos."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-soft">
        <span className="font-semibold text-text tabular-nums">{Number(head.total_count)}</span> en total
        <span className="px-2">·</span>
        <span className="font-semibold text-text tabular-nums">{Number(head.last_30_days)}</span> en 30 días
        <span className="px-2">·</span>
        <span className="font-semibold text-text tabular-nums">{Number(head.last_7_days)}</span> en 7 días
      </p>
      <div>
        <div className={`hidden grid-cols-1 gap-x-4 border-b border-border px-3 pb-2 text-xs font-medium text-text-soft sm:grid ${DEL_COLS}`}>
          <span>Usuario</span>
          <span>Eliminó</span>
          <span>Duró</span>
          <span>Tenía</span>
        </div>
        <div className="divide-y divide-border/60">
          {rows.map((d) => (
            <div key={d.id} className={`grid grid-cols-1 gap-x-4 gap-y-0.5 px-1 py-3 sm:items-center sm:px-3 ${DEL_COLS}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{d.username ? `@${d.username}` : "Sin usuario"}</p>
                <p className="text-xs text-text-soft">{ROLE_LABEL[d.role ?? ""] ?? d.role ?? "—"}</p>
              </div>
              <p className="text-sm text-text-soft">{timeAgo(d.deleted_at)}</p>
              <p className="text-sm text-text-soft">{lifespan(d.signed_up_at, d.deleted_at)}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-text-soft">
                <span>
                  {plural(d.reviews_count, "reseña", "reseñas")}
                  {d.owned_restaurants > 0 && ` · ${plural(d.owned_restaurants, "local", "locales")}`}
                </span>
                {d.was_banned && <Badge tone="danger">Suspendido</Badge>}
                {!d.was_banned && d.strikes > 0 && <Badge tone="warn">{plural(d.strikes, "strike", "strikes")}</Badge>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-text-soft">
        Solo se guarda lo mínimo para moderar: usuario, rol, fechas y conteos. Ni el correo ni el contenido de la cuenta se conservan.
      </p>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export function Users() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") ?? "directorio") as Tab;
  const [jump, setJump] = useState("");

  function goTab(t: Tab) {
    const next = new URLSearchParams();
    if (t !== "directorio") next.set("tab", t);
    setParams(next, { replace: true });
  }
  function openUser(username: string) {
    setJump(username + Date.now());
    setParams({ q: username }, { replace: true });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Usuarios" />
      <Tabs
        value={tab}
        onChange={goTab}
        options={[
          { value: "directorio", label: "Directorio" },
          { value: "bloqueos", label: "Bloqueos" },
          { value: "eliminadas", label: "Eliminadas" },
        ]}
      />
      {tab === "directorio" && <Directory jump={jump} />}
      {tab === "bloqueos" && <Blocks onOpenUser={openUser} />}
      {tab === "eliminadas" && <Deleted />}
    </div>
  );
}
