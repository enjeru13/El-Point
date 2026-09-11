import { MessageSquareWarning, Star } from "lucide-react";
import { useModerationQueue, useResolveReview, type ModerationItem } from "../lib/queries/moderation";
import { reasonLabel, REVIEW_REPORT_REASONS } from "../lib/reasons";
import { Badge, Button, EmptyState, PageHeader, PageLoading, StripeCard, timeAgo } from "../components/ui";

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          strokeWidth={1.5}
          fill={i < n ? "var(--brand)" : "none"}
          color="var(--brand)"
        />
      ))}
    </span>
  );
}

function Row({ item }: { item: ModerationItem }) {
  const resolve = useResolveReview();

  return (
    <StripeCard tone={item.moderation === "hidden" ? "danger" : "neutral"} className="flex flex-col gap-4 py-5 pr-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-base font-bold text-text">{item.restaurant_name}</p>
          <Badge>{item.author_name}</Badge>
          <Stars n={item.rating} />
          {item.moderation === "hidden" && <Badge tone="danger">Auto-oculta</Badge>}
          <span className="text-xs text-text-soft">{timeAgo(item.created_at)}</span>
        </div>
        <p className="mt-2 text-sm text-text-soft">{item.body}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3">
        {item.reports.map((rep, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold text-text">{reasonLabel(REVIEW_REPORT_REASONS, rep.reason)}</span>
            <span className="ml-2 text-xs text-text-soft">{timeAgo(rep.created_at)}</span>
            {rep.note && <p className="text-text-soft">{rep.note}</p>}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="danger"
          loading={resolve.isPending}
          onClick={() => resolve.mutate({ reviewId: item.id, action: "remove" })}
        >
          Eliminar reseña
        </Button>
        <Button loading={resolve.isPending} onClick={() => resolve.mutate({ reviewId: item.id, action: "approve" })}>
          Mantener visible
        </Button>
      </div>
    </StripeCard>
  );
}

export function ReportedReviews() {
  const q = useModerationQueue();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Moderación" title="Reseñas reportadas" body="Ordenadas por cantidad de reportes." />

      {q.isLoading ? (
        <PageLoading />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title="Sin reseñas reportadas" body="No hay nada que moderar por ahora." />
      ) : (
        <div className="flex flex-col gap-4">
          {q.data!.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
