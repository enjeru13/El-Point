import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Search, UserX, Users as UsersIcon, X } from "lucide-react";
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
import { Badge, Button, Card, EmptyState, INPUT, PageHeader, PageLoading, Tabs, timeAgo } from "../components/ui";

type Tab = "directorio" | "bloqueos" | "eliminadas";

const ROLE_LABEL: Record<string, string> = { customer: "Comensal", restaurant_owner: "Dueño" };

const FILTERS: { value: UserFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "banned", label: "Suspendidos" },
  { value: "strikes", label: "Con strikes" },
  { value: "blocked", label: "Bloqueados por otros" },
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

function Initial({ name, banned }: { name: string; banned?: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        banned ? "bg-danger/12 text-danger" : "bg-surface-2 text-text-soft"
      }`}
      aria-hidden
    >
      {name.replace("@", "").charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** Tres marcas: cuántos strikes lleva el usuario (el panel suspende al tercero). */
function Strikes({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`${n} strike${n === 1 ? "" : "s"}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i < n ? "bg-danger" : "bg-border"}`} />
      ))}
      <span className="sr-only">{n} strikes</span>
    </span>
  );
}

// ─── Directorio ──────────────────────────────────────────────────────────────

const ACTION_COPY: Record<UserAction, { title: string; body: string; cta: string; danger?: boolean }> = {
  ban: {
    title: "Suspender cuenta",
    body: "Pierde acceso a la app de inmediato y deja de aparecer en reseñas nuevas. Puedes reactivarla cuando quieras.",
    cta: "Suspender",
    danger: true,
  },
  unban: {
    title: "Reactivar cuenta",
    body: "Vuelve a entrar a la app con normalidad. Los strikes no se borran.",
    cta: "Reactivar",
  },
  clear_strikes: {
    title: "Limpiar strikes",
    body: "Los strikes vuelven a cero. Úsalo si fue un error o ya pasó un tiempo prudente.",
    cta: "Limpiar strikes",
  },
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
          <Button variant="danger" onClick={() => setAction("ban")}>
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
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3">
          <p className="text-sm font-semibold text-text">
            {copy.title}: <span className="font-bold">{displayName(u)}</span>
          </p>
          <p className="text-sm text-text-soft">{copy.body}</p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo (opcional, queda en el historial)"
            className={INPUT}
            aria-label="Motivo"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button variant={copy.danger ? "danger" : "primary"} loading={set.isPending} onClick={run}>
              {copy.cta}
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
  const name = displayName(u);
  return (
    <div className={u.banned_at ? "bg-danger/[0.04]" : undefined}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-surface-2 sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_72px] sm:gap-4"
      >
        <Initial name={name} banned={!!u.banned_at} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-display text-base font-bold text-text">{name}</p>
            {u.banned_at && <span className="shrink-0"><Badge tone="danger">Suspendido</Badge></span>}
          </div>
          <p className="truncate text-sm text-text-soft">{u.full_name && u.username ? u.full_name : (u.email ?? "")}</p>
        </div>
        <div className="hidden min-w-0 sm:block">
          <Badge tone={u.role === "restaurant_owner" ? "brand" : "neutral"}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
          <p className="mt-1 truncate text-xs text-text-soft">
            Nivel {u.level} · {u.xp.toLocaleString("es-VE")} XP
          </p>
        </div>
        <div className="hidden min-w-0 text-sm text-text-soft sm:block">
          <p className="truncate">
            {u.reviews_count} {u.reviews_count === 1 ? "reseña" : "reseñas"}
            {u.restaurants_count > 0 && ` · ${u.restaurants_count} ${u.restaurants_count === 1 ? "local" : "locales"}`}
          </p>
          <p className={`truncate text-xs ${u.blocked_by_count > 0 ? "font-semibold text-danger" : ""}`}>
            {u.blocked_by_count > 0 ? `Bloqueado por ${u.blocked_by_count}` : `Desde ${fmtDate(u.created_at)}`}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          {u.strikes > 0 && <Strikes n={u.strikes} />}
          <ChevronDown className={`h-4 w-4 text-text-soft transition ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden />
        </div>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-border bg-surface-2/60 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-text-soft">Correo</dt>
            <dd className="min-w-0 truncate font-semibold text-text">{u.email ?? "—"}</dd>
            <dt className="text-text-soft">Registro</dt>
            <dd className="font-semibold text-text">{fmtDate(u.created_at)}</dd>
            <dt className="text-text-soft">Rol</dt>
            <dd className="font-semibold text-text">{ROLE_LABEL[u.role] ?? u.role}</dd>
            <dt className="text-text-soft">Strikes</dt>
            <dd className="font-semibold text-text">{u.strikes}</dd>
            <dt className="text-text-soft">Bloqueado por</dt>
            <dd className="font-semibold text-text">{u.blocked_by_count} {u.blocked_by_count === 1 ? "persona" : "personas"}</dd>
            {u.banned_at && (
              <>
                <dt className="text-text-soft">Suspendido</dt>
                <dd className="font-semibold text-danger">{timeAgo(u.banned_at)}</dd>
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

  // Un salto desde otra pestaña o desde la paleta de comandos reemplaza la búsqueda.
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" strokeWidth={2} />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Buscar por usuario, nombre o correo"
            aria-label="Buscar usuarios"
            className={`${INPUT} px-9`}
          />
          {text ? (
            <button
              onClick={() => setText("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-text-soft hover:text-text"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface-2 px-1.5 text-[11px] font-semibold text-text-soft sm:block">
              /
            </kbd>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar usuarios">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setParam("filtro", f.value)}
            aria-pressed={filter === f.value}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
              filter === f.value
                ? "border-brand bg-brand/10 text-brand"
                : "border-border bg-surface text-text-soft hover:text-text"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <PageLoading />
      ) : q.isError ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          No se pudo cargar el directorio: {(q.error as Error).message}
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Nadie coincide"
          body={urlQ || filter !== "all" ? "Prueba con otra búsqueda o quita el filtro." : "Aún no hay usuarios registrados."}
        />
      ) : (
        <Card className={`overflow-hidden transition-opacity ${q.isFetching ? "opacity-70" : ""}`}>
          <div className="divide-y divide-border">
            {rows.map((u) => (
              <UserRow key={u.id} u={u} open={openId === u.id} onToggle={() => setOpenId(openId === u.id ? null : u.id)} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-xs text-text-soft">
            <p className="tabular-nums">
              {from}–{to} de {total.toLocaleString("es-VE")}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setParam("p", String(page - 1))}
                disabled={page === 0}
                aria-label="Página anterior"
                className="flex h-8 w-8 items-center justify-center rounded-full transition enabled:hover:bg-surface-2 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                onClick={() => setParam("p", String(page + 1))}
                disabled={to >= total}
                aria-label="Página siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-full transition enabled:hover:bg-surface-2 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Bloqueos ────────────────────────────────────────────────────────────────

function Blocks({ onOpenUser }: { onOpenUser: (username: string) => void }) {
  const most = useMostBlocked();
  const recent = useRecentBlocks();
  const top = most.data?.[0]?.blocked_by_count ?? 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-text">Más bloqueados</h2>
          <p className="text-sm text-text-soft">Si mucha gente bloquea a la misma persona, vale la pena revisar su actividad.</p>
        </div>
        {most.isLoading ? (
          <PageLoading />
        ) : !most.data?.length ? (
          <EmptyState title="Nadie ha sido bloqueado" body="Cuando los usuarios se bloqueen entre sí, aquí verás a quién más." />
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {most.data.map((m) => (
              <button
                key={m.user_id}
                onClick={() => m.username && onOpenUser(m.username)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 text-left transition hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-base font-bold text-text">{displayName(m)}</p>
                    {m.banned_at && <Badge tone="danger">Suspendido</Badge>}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${Math.max(8, (m.blocked_by_count / top) * 100)}%` }}
                      />
                    </span>
                    <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-text-soft">
                      {m.blocked_by_count} {m.blocked_by_count === 1 ? "bloqueo" : "bloqueos"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-text-soft">
                  {m.strikes > 0 && <Strikes n={m.strikes} />}
                  <span>{timeAgo(m.last_blocked_at)}</span>
                </div>
              </button>
            ))}
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-text">Bloqueos recientes</h2>
          <p className="text-sm text-text-soft">Quién bloqueó a quién, lo más nuevo primero.</p>
        </div>
        {recent.isLoading ? (
          <PageLoading />
        ) : !recent.data?.length ? (
          <EmptyState title="Sin bloqueos todavía" />
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {recent.data.map((b) => (
              <div key={`${b.blocker_id}-${b.blocked_id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <p className="min-w-0 truncate text-text-soft">
                  <span className="font-semibold text-text">{b.blocker_username ? `@${b.blocker_username}` : "Cuenta eliminada"}</span>
                  {" bloqueó a "}
                  <span className="font-semibold text-text">{b.blocked_username ? `@${b.blocked_username}` : "cuenta eliminada"}</span>
                </p>
                <span className="shrink-0 text-xs text-text-soft">{timeAgo(b.created_at)}</span>
              </div>
            ))}
          </Card>
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
  if (d < 30) return `${d} ${d === 1 ? "día" : "días"}`;
  const m = Math.floor(d / 30);
  return `${m} ${m === 1 ? "mes" : "meses"}`;
}

function Deleted() {
  const q = useDeletedAccounts();
  const rows = q.data ?? [];
  const head = rows[0];

  if (q.isLoading) return <PageLoading />;
  if (!rows.length) {
    return (
      <EmptyState
        icon={UserX}
        title="Nadie ha eliminado su cuenta"
        body="Cuando alguien la elimine desde la app, queda aquí un registro mínimo: usuario, fechas y conteos."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-soft">
        <span className="font-bold text-text">{Number(head.total_count)}</span> en total ·{" "}
        <span className="font-bold text-text">{Number(head.last_30_days)}</span> en 30 días ·{" "}
        <span className="font-bold text-text">{Number(head.last_7_days)}</span> en 7 días
      </p>
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)] gap-4 border-b border-border bg-surface-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-text-soft sm:grid">
          <span>Usuario</span>
          <span>Eliminó</span>
          <span>Duró</span>
          <span>Tenía</span>
        </div>
        <div className="divide-y divide-border">
          {rows.map((d) => (
            <div
              key={d.id}
              className="grid grid-cols-1 gap-1 px-5 py-3.5 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)] sm:items-center sm:gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display text-base font-bold text-text">{d.username ? `@${d.username}` : "Sin usuario"}</p>
                  {d.was_banned && <Badge tone="danger">Estaba suspendido</Badge>}
                </div>
                <p className="text-xs text-text-soft">{ROLE_LABEL[d.role ?? ""] ?? d.role ?? "—"}</p>
              </div>
              <div className="text-sm text-text-soft">
                <p className="font-semibold text-text">{timeAgo(d.deleted_at)}</p>
                <p className="text-xs">{fmtDate(d.deleted_at)}</p>
              </div>
              <p className="text-sm text-text-soft">
                {lifespan(d.signed_up_at, d.deleted_at)}
                {d.signed_up_at && <span className="block text-xs">Entró el {fmtDate(d.signed_up_at)}</span>}
              </p>
              <p className="text-sm text-text-soft">
                {d.reviews_count} {d.reviews_count === 1 ? "reseña" : "reseñas"}
                {d.owned_restaurants > 0 && ` · ${d.owned_restaurants} ${d.owned_restaurants === 1 ? "local" : "locales"}`}
                {d.strikes > 0 && <span className="block text-xs text-danger">{d.strikes} strikes</span>}
              </p>
            </div>
          ))}
        </div>
      </Card>
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
      <PageHeader eyebrow="Moderación" title="Usuarios" body="Quién está en El Point, a quién bloquean y quién se fue." />
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
