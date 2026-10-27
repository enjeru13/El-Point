import { useModerationQueue, useResolveReview, type ModerationItem } from "../lib/queries/moderation";
import { reasonLabel, REVIEW_REPORT_REASONS } from "../lib/reasons";
import { Badge, Button, EmptyState, PageHeader, PageLoading, timeAgo } from "../components/ui";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-xs font-medium tabular-nums text-text-soft" aria-label={`${n} de 5 estrellas`}>
      ★ {n}
    </span>
  );
}

function Row({ item }: { item: ModerationItem }) {
  const resolve = useResolveReview();

  return (
    <div className="flex flex-col gap-4 px-1 py-5 sm:px-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-text">{item.restaurant_name}</p>
          <Badge>{item.author_name}</Badge>
          <Stars n={item.rating} />
          {item.moderation === "hidden" && <Badge tone="danger">Auto-oculta</Badge>}
          <span className="text-xs text-text-soft">{timeAgo(item.created_at)}</span>
        </div>
        <p className="mt-2 text-sm text-text-soft">{item.body}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {item.reports.map((rep, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium text-text">{reasonLabel(REVIEW_REPORT_REASONS, rep.reason)}</span>
            <span className="ml-2 text-xs text-text-soft">{timeAgo(rep.created_at)}</span>
            {rep.note && <p className="text-text-soft">{rep.note}</p>}
          </li>
        ))}
      </ul>

      <div className="flex justify-end gap-2">
        <Button variant="danger" loading={resolve.isPending} onClick={() => resolve.mutate({ reviewId: item.id, action: "remove" })}>
          Eliminar reseña
        </Button>
        <Button loading={resolve.isPending} onClick={() => resolve.mutate({ reviewId: item.id, action: "approve" })}>
          Mantener visible
        </Button>
      </div>
    </div>
  );
}

export function ReportedReviews() {
  const q = useModerationQueue();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reseñas reportadas" body="Ordenadas por cantidad de reportes." />

      {q.isLoading ? (
        <PageLoading />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title="Sin reseñas reportadas" body="No hay nada que moderar por ahora." />
      ) : (
        <div className="divide-y divide-border/60 border-y border-border">
          {q.data!.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
