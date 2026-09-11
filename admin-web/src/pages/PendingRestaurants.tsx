import { useState } from "react";
import { AtSign, Clock, MessageCircle, Store } from "lucide-react";
import { useRestaurantQueue, useReviewRestaurant, type PendingRestaurant } from "../lib/queries/admin";
import { Badge, Button, EmptyState, PageHeader, PageLoading, StripeCard, timeAgo } from "../components/ui";

function Row({ r }: { r: PendingRestaurant }) {
  const review = useReviewRestaurant();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <StripeCard tone="brand" className="flex flex-col gap-4 py-5 pr-5">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
          {r.photo_url ? (
            <img src={r.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Store className="h-6 w-6 text-text-soft" strokeWidth={1.5} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-bold text-text">{r.name}</p>
            <Badge>{r.owner_name}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-text-soft">{r.address ?? "Sin dirección"}</p>
          {r.categories.length > 0 && (
            <p className="mt-1 text-xs text-text-soft">{r.categories.join(" · ")}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-soft">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
              {timeAgo(r.submitted_at)}
            </span>
            {r.rif && <span>RIF {r.rif}</span>}
            {r.whatsapp && (
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
                {r.whatsapp}
              </span>
            )}
            {r.instagram && (
              <span className="inline-flex items-center gap-1">
                <AtSign className="h-3.5 w-3.5" strokeWidth={2} />
                {r.instagram}
              </span>
            )}
          </div>
        </div>
      </div>

      {rejecting ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3">
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (se lo mostramos al dueño)…"
            className="min-h-16 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejecting(false)}>Cancelar</Button>
            <Button
              variant="danger"
              loading={review.isPending}
              onClick={() =>
                review.mutate(
                  { restaurantId: r.id, action: "reject", reason: reason.trim() || undefined },
                  { onSuccess: () => setRejecting(false) },
                )
              }
            >
              Confirmar rechazo
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejecting(true)} disabled={review.isPending}>
            Rechazar
          </Button>
          <Button
            loading={review.isPending}
            onClick={() => review.mutate({ restaurantId: r.id, action: "approve" })}
          >
            Aprobar
          </Button>
        </div>
      )}
    </StripeCard>
  );
}

export function PendingRestaurants() {
  const queueQ = useRestaurantQueue();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Verificación"
        title="Locales pendientes"
        body="Revisa y aprueba antes de que aparezcan en la app."
      />

      {queueQ.isLoading ? (
        <PageLoading />
      ) : (queueQ.data ?? []).length === 0 ? (
        <EmptyState icon={Store} title="Nada pendiente" body="Todos los locales enviados ya fueron revisados." />
      ) : (
        <div className="flex flex-col gap-4">
          {queueQ.data!.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
