import { useState } from "react";
import { TOPIC_LABEL, useReportedCommunity, useResolveCommunity, type ReportedItem } from "../lib/queries/community";
import { reasonLabel, REVIEW_REPORT_REASONS } from "../lib/reasons";
import { Badge, Button, EmptyState, PageHeader, PageLoading, Segmented, timeAgo } from "../components/ui";

type Filter = "all" | "post" | "reply";

function Row({ item }: { item: ReportedItem }) {
  const resolve = useResolveCommunity();
  const [acting, setActing] = useState<"keep" | "remove" | null>(null);
  const act = (action: "keep" | "remove") => {
    setActing(action);
    resolve.mutate({ kind: item.kind, id: item.id, action }, { onSettled: () => setActing(null) });
  };

  return (
    <div className="flex flex-col gap-4 px-1 py-5 sm:px-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={item.kind === "post" ? "brand" : "neutral"}>{item.kind === "post" ? "Post" : "Respuesta"}</Badge>
          {item.topic && <span className="text-xs font-medium text-text-soft">{TOPIC_LABEL[item.topic] ?? item.topic}</span>}
          <p className="text-sm font-semibold text-text">{item.as_restaurant_name ?? item.author_name}</p>
          {item.as_restaurant_name && <Badge tone="warn">Local</Badge>}
          {item.moderation === "hidden" && <Badge tone="danger">Auto-oculto</Badge>}
          <span className="text-xs text-text-soft">{timeAgo(item.created_at)}</span>
        </div>

        {item.parent_body && (
          <p className="mt-2 line-clamp-2 border-l-2 border-border pl-3 text-xs text-text-soft">
            En respuesta a: {item.parent_body}
          </p>
        )}
        <p className="mt-2 whitespace-pre-line text-sm text-text">{item.body}</p>
        {item.place_name && <p className="mt-1 text-xs text-text-soft">Local etiquetado: {item.place_name}</p>}

        {item.photo_urls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.photo_urls.map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer">
                <img src={u} alt="" className="h-20 w-20 rounded-md border border-border object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </div>

      {item.reports.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {item.reports.map((rep, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-text">{reasonLabel(REVIEW_REPORT_REASONS, rep.reason)}</span>
              <span className="ml-2 text-xs text-text-soft">{timeAgo(rep.created_at)}</span>
              {rep.note && <p className="text-text-soft">{rep.note}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-text-soft">Oculto sin reportes pendientes.</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {item.kind === "post" && (
          <span className="mr-auto text-xs text-text-soft">
            Retirar suma un strike al autor{item.as_restaurant_name ? " y un retiro al local" : ""}.
          </span>
        )}
        <Button variant="danger" loading={acting === "remove"} disabled={!!acting} onClick={() => act("remove")}>
          Retirar
        </Button>
        <Button loading={acting === "keep"} disabled={!!acting} onClick={() => act("keep")}>
          Dejar visible
        </Button>
      </div>
    </div>
  );
}

export function ReportedPosts() {
  const q = useReportedCommunity();
  const [filter, setFilter] = useState<Filter>("all");
  const all = q.data ?? [];
  const list = filter === "all" ? all : all.filter((i) => i.kind === filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comunidad reportada"
        body="Posts y respuestas con reportes. Con 3 reportes distintos se ocultan solos hasta que decidas."
      />

      <Segmented
        label="Filtrar"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: `Todo (${all.length})` },
          { value: "post", label: "Posts" },
          { value: "reply", label: "Respuestas" },
        ]}
      />

      {q.isLoading ? (
        <PageLoading />
      ) : q.isError ? (
        <EmptyState title="No pudimos cargar la cola" body="Revisa tu conexión y recarga la página." />
      ) : list.length === 0 ? (
        <EmptyState title="Nada reportado" body="No hay posts ni respuestas que moderar por ahora." />
      ) : (
        <div className="divide-y divide-border/60 border-y border-border">
          {list.map((item) => (
            <Row key={`${item.kind}:${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
