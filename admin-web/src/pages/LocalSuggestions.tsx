import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  SUGGESTION_LABEL,
  useLocalSuggestions,
  useSetSuggestionStatus,
  type LocalSuggestion,
  type SuggestionStatus,
} from "../lib/queries/community";
import { useAllLocales } from "../lib/queries/locales";
import { Badge, Button, EmptyState, INPUT, PageHeader, PageLoading, Segmented, timeAgo } from "../components/ui";

const TONE: Record<SuggestionStatus, "neutral" | "brand" | "good" | "warn"> = {
  pendiente: "brand",
  contactado: "warn",
  alta: "good",
  descartado: "neutral",
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Buscador de locales de la app para dar de alta una sugerencia. */
function LocalPicker({ initial, onPick, onCancel }: { initial: string; onPick: (id: string) => void; onCancel: () => void }) {
  const locales = useAllLocales();
  const [term, setTerm] = useState(initial);
  const matches = useMemo(() => {
    const t = norm(term.trim());
    return (locales.data ?? []).filter((l) => !t || norm(l.name).includes(t)).slice(0, 8);
  }, [locales.data, term]);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p className="text-xs font-medium text-text-soft">¿Cuál local de El Point es?</p>
      <input
        autoFocus
        className={INPUT}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Busca por nombre"
        aria-label="Buscar local"
      />
      {locales.isLoading ? (
        <p className="text-sm text-text-soft">Cargando locales…</p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-text-soft">Ningún local coincide. Primero tiene que registrarse en la app.</p>
      ) : (
        <ul className="flex flex-col">
          {matches.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => onPick(l.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
              >
                <span className="flex-1 truncate font-medium text-text">{l.name}</span>
                <span className="text-xs text-text-soft">{l.zone_label ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function Row({ s }: { s: LocalSuggestion }) {
  const set = useSetSuggestionStatus();
  const [picking, setPicking] = useState(false);
  const [acting, setActing] = useState<SuggestionStatus | null>(null);
  const change = (status: SuggestionStatus, restaurantId?: string) => {
    setActing(status);
    set.mutate(
      { name: s.normalized_name, status, restaurantId },
      {
        onSuccess: () => setPicking(false),
        onSettled: () => setActing(null),
      },
    );
  };

  return (
    <div className="flex flex-col gap-3 px-1 py-5 sm:px-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-text">{s.display_name}</p>
        <Badge tone={TONE[s.status]}>{SUGGESTION_LABEL[s.status]}</Badge>
        <span className="text-xs text-text-soft">
          {s.post_count} {s.post_count === 1 ? "post" : "posts"}
          {s.last_zone ? ` · ${s.last_zone}` : ""}
          {s.last_post_at ? ` · ${timeAgo(s.last_post_at)}` : ""}
        </span>
      </div>

      {s.status === "alta" && s.restaurant_id && (
        <p className="text-sm text-text-soft">
          Enlazado a{" "}
          <Link to={`/locales/${s.restaurant_id}`} className="font-medium text-brand hover:underline">
            {s.restaurant_name ?? "el local"}
          </Link>
          . Quien lo sugirió primero ya recibió +25 XP y la misión.
        </p>
      )}

      {picking ? (
        <LocalPicker initial={s.display_name} onPick={(id) => change("alta", id)} onCancel={() => setPicking(false)} />
      ) : (
        s.status !== "alta" && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" loading={acting === "descartado"} disabled={!!acting} onClick={() => change("descartado")}>
              Descartar
            </Button>
            {s.status !== "contactado" && (
              <Button variant="secondary" loading={acting === "contactado"} disabled={!!acting} onClick={() => change("contactado")}>
                Contactado
              </Button>
            )}
            <Button disabled={!!acting} onClick={() => setPicking(true)}>
              Dar de alta
            </Button>
          </div>
        )
      )}
    </div>
  );
}

type Filter = "abiertas" | "alta" | "all";

export function LocalSuggestions() {
  const q = useLocalSuggestions();
  const [filter, setFilter] = useState<Filter>("abiertas");
  const all = q.data ?? [];
  const list = all.filter((s) =>
    filter === "all" ? true : filter === "alta" ? s.status === "alta" : s.status === "pendiente" || s.status === "contactado",
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Locales sugeridos"
        body="Locales que la gente nombra en Comunidad y todavía no están en El Point. Agrupados por nombre."
      />

      <Segmented
        label="Filtrar"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "abiertas", label: "Por gestionar" },
          { value: "alta", label: "De alta" },
          { value: "all", label: "Todas" },
        ]}
      />

      {q.isLoading ? (
        <PageLoading />
      ) : q.isError ? (
        <EmptyState title="No pudimos cargar las sugerencias" body="Revisa tu conexión y recarga la página." />
      ) : list.length === 0 ? (
        <EmptyState title="Sin sugerencias" body="Cuando alguien publique sobre un local que no está en la app, aparecerá aquí." />
      ) : (
        <div className="divide-y divide-border/60 border-y border-border">
          {list.map((s) => (
            <Row key={s.normalized_name} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
