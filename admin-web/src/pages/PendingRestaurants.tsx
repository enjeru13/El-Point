import { useState } from "react";
import { useRestaurantQueue, useReviewRestaurant, type PendingRestaurant } from "../lib/queries/admin";
import { Badge, Button, Card, EmptyState, PageLoading, timeAgo } from "../components/ui";

function Row({ r }: { r: PendingRestaurant }) {
  const review = useReviewRestaurant();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2">
          {r.photo_url ? (
            <img src={r.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">🏪</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-base font-bold text-text">{r.name}</p>
            <Badge>{r.owner_name}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-text-soft">{r.address ?? "Sin dirección"}</p>
          {r.categories.length > 0 && (
            <p className="mt-1 text-xs text-text-soft">{r.categories.join(" · ")}</p>
          )}
          <p className="mt-1 text-xs text-text-soft">
            Enviado {timeAgo(r.submitted_at)}
            {r.rif && ` · RIF ${r.rif}`}
            {(r.whatsapp || r.instagram) && " · "}
            {r.whatsapp && `WhatsApp ${r.whatsapp}`}
            {r.instagram && ` @${r.instagram}`}
          </p>
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
    </Card>
  );
}

export function PendingRestaurants() {
  const queueQ = useRestaurantQueue();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Locales pendientes</h1>
        <p className="mt-1 text-text-soft">Revisa y aprueba antes de que aparezcan en la app.</p>
      </div>

      {queueQ.isLoading ? (
        <PageLoading />
      ) : (queueQ.data ?? []).length === 0 ? (
        <EmptyState title="Nada pendiente" body="Todos los locales enviados ya fueron revisados." />
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
