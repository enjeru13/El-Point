import { useState } from "react";
import { useRestaurantQueue, useReviewRestaurant, type PendingRestaurant } from "../lib/queries/admin";
import { Badge, Button, EmptyState, INPUT, PageHeader, PageLoading, timeAgo } from "../components/ui";

function Row({ r }: { r: PendingRestaurant }) {
  const review = useReviewRestaurant();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const details = [
    timeAgo(r.submitted_at),
    r.rif && `RIF ${r.rif}`,
    r.whatsapp && `WhatsApp ${r.whatsapp}`,
    r.instagram && `Instagram ${r.instagram}`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4 px-1 py-5 sm:px-3">
      <div className="flex items-start gap-4">
        {r.photo_url && (
          <img src={r.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-md border border-border object-cover" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-text">{r.name}</p>
            <Badge>{r.owner_name}</Badge>
            {r.ghost_kitchen && <Badge>Cocina fantasma</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-text-soft">
            {r.ghost_kitchen ? (r.zone_label ?? "Sin zona indicada") : (r.address ?? "Sin dirección")}
          </p>
          {r.categories.length > 0 && <p className="mt-0.5 text-xs text-text-soft">{r.categories.join(" · ")}</p>}
          <p className="mt-2 text-xs text-text-soft">{details.join(" · ")}</p>
        </div>
      </div>

      {rejecting ? (
        <div className="flex flex-col gap-3">
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (se lo mostramos al dueño)…"
            aria-label="Motivo del rechazo"
            className={`${INPUT} min-h-16 resize-none`}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejecting(false)}>
              Cancelar
            </Button>
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
          <Button loading={review.isPending} onClick={() => review.mutate({ restaurantId: r.id, action: "approve" })}>
            Aprobar
          </Button>
        </div>
      )}
    </div>
  );
}

export function PendingRestaurants() {
  const queueQ = useRestaurantQueue();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Locales pendientes" body="Revisa y aprueba antes de que aparezcan en la app." />

      {queueQ.isLoading ? (
        <PageLoading />
      ) : (queueQ.data ?? []).length === 0 ? (
        <EmptyState title="Nada pendiente" body="Todos los locales enviados ya fueron revisados." />
      ) : (
        <div className="divide-y divide-border/60 border-y border-border">
          {queueQ.data!.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
