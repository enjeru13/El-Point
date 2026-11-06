import { Link } from "react-router-dom";
import {
  useAppSettings,
  useCommunityBanned,
  useRestoreCommunity,
  useSetOwnerPosts,
} from "../lib/queries/community";
import { Badge, Button, EmptyState, PageHeader, PageLoading, Spinner, timeAgo } from "../components/ui";

function Switch({ on, busy, onChange, label }: { on: boolean; busy: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
        on ? "bg-brand" : "bg-surface-2 ring-1 ring-inset ring-border"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

function OwnerPostsSetting() {
  const settings = useAppSettings();
  const set = useSetOwnerPosts();
  const on = set.isPending ? !!set.variables : !!settings.data?.owner_posts_enabled;

  return (
    <div className="flex items-start gap-4 border-y border-border px-1 py-5 sm:px-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">Locales publican en Comunidad</p>
        <p className="mt-1 text-sm text-text-soft">
          Los locales con plan pueden publicar novedades (una cada 24 horas) y responder donde los mencionan. Apágalo para
          pausarlo en toda la app.
        </p>
        {set.isError && <p className="mt-1 text-sm text-danger">No se pudo guardar. Inténtalo de nuevo.</p>}
      </div>
      {settings.isLoading ? (
        <Spinner />
      ) : (
        <Switch on={on} busy={set.isPending} onChange={(v) => set.mutate(v)} label="Locales publican en Comunidad" />
      )}
    </div>
  );
}

function BannedLocals() {
  const q = useCommunityBanned();
  const restore = useRestoreCommunity();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-text">Permiso de publicar</h2>
        <p className="mt-1 text-sm text-text-soft">
          Cada post de un local que retiras cuenta. Con 3 retiros pierde el permiso de publicar en Comunidad.
        </p>
      </div>

      {q.isLoading ? (
        <PageLoading />
      ) : q.isError ? (
        <EmptyState
          title="No pudimos cargar la lista"
          body="Si acabas de actualizar, falta aplicar la migración admin_community_banned."
        />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title="Ningún local con retiros" body="Todos los locales pueden publicar." />
      ) : (
        <div className="divide-y divide-border/60 border-y border-border">
          {q.data!.map((b) => {
            const banned = !!b.community_banned_at;
            const busy = restore.isPending && restore.variables === b.restaurant_id;
            return (
              <div key={b.restaurant_id} className="flex flex-wrap items-center gap-3 px-1 py-4 sm:px-3">
                <Link to={`/locales/${b.restaurant_id}`} className="text-sm font-semibold text-text hover:underline">
                  {b.name}
                </Link>
                {banned ? <Badge tone="danger">Sin permiso</Badge> : <Badge tone="warn">Con retiros</Badge>}
                <span className="text-xs text-text-soft">
                  {b.community_removals} de 3 retiros
                  {banned ? ` · desde ${timeAgo(b.community_banned_at!)}` : ""}
                </span>
                <Button
                  variant={banned ? "primary" : "secondary"}
                  className="ml-auto"
                  loading={busy}
                  disabled={restore.isPending}
                  onClick={() => restore.mutate(b.restaurant_id)}
                >
                  {banned ? "Devolver permiso" : "Poner en cero"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Settings() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Ajustes" body="Opciones generales de la app." />
      <OwnerPostsSetting />
      <BannedLocals />
    </div>
  );
}
