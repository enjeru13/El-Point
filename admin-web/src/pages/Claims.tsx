import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, MessageCircle } from "lucide-react";
import { usePendingClaims, useReviewClaim, type PendingClaim } from "../lib/queries/claims";
import { waLink } from "../lib/format";
import { Badge, Button, EmptyState, INPUT, PageHeader, PageLoading, timeAgo } from "../components/ui";

function Row({ c }: { c: PendingClaim }) {
  const review = useReviewClaim();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const wa = waLink(c.whatsapp, `Hola ${c.full_name}, te escribimos de El Point por tu solicitud de ${c.restaurant.name}.`);
  const map = c.restaurant.lat != null && c.restaurant.lng != null ? `https://www.google.com/maps?q=${c.restaurant.lat},${c.restaurant.lng}` : null;

  return (
    <div className="flex flex-col gap-4 px-1 py-5 sm:px-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {c.photo_url ? (
          <a href={c.photo_url} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={c.photo_url} alt="Foto de prueba" className="h-40 w-full rounded-md border border-border object-cover sm:h-28 sm:w-28" />
          </a>
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-md border border-border text-xs text-text-soft">Sin foto</div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/locales/${c.restaurant.id}`} className="text-sm font-semibold text-text hover:underline">
              {c.restaurant.name}
            </Link>
            {c.competing > 0 && <Badge tone="warn">{c.competing === 1 ? "Otra persona también lo pidió" : `${c.competing} personas más lo pidieron`}</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-text-soft">
            {c.restaurant.address ?? "Sin dirección"}
            {map && (
              <>
                {" · "}
                <a href={map} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
                  Ver en el mapa <ExternalLink size={12} />
                </a>
              </>
            )}
          </p>
          <p className="mt-2 text-sm text-text">
            <span className="font-semibold">{c.full_name}</span>
            {c.username && <span className="text-text-soft"> ({c.username})</span>}
          </p>
          <p className="text-xs text-text-soft">
            {[timeAgo(c.created_at), `WhatsApp ${c.whatsapp}`, c.rif && `RIF ${c.rif}`].filter(Boolean).join(" · ")}
          </p>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <MessageCircle size={14} /> Escribirle por WhatsApp
            </a>
          )}
        </div>
      </div>

      {review.isError && <p className="text-sm text-danger">{(review.error as Error).message}</p>}

      {rejecting ? (
        <div className="flex flex-col gap-3">
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (se lo mostramos a la persona)…"
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
              onClick={() => review.mutate({ id: c.id, approve: false, reason: reason.trim() || undefined })}
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
            onClick={() => {
              if (confirm(`¿Entregar "${c.restaurant.name}" a ${c.full_name}? Pasa a su cuenta con su plan y Destacado de bienvenida.`))
                review.mutate({ id: c.id, approve: true });
            }}
          >
            Aprobar
          </Button>
        </div>
      )}
    </div>
  );
}

export function Claims() {
  const q = usePendingClaims();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reclamos de locales"
        body="Personas que dicen ser dueñas de un local que ya estaba en la app. Revisa la foto y, si hace falta, escríbeles antes de aprobar."
      />
      {q.isLoading ? (
        <PageLoading />
      ) : q.isError ? (
        <p className="text-sm text-danger">{(q.error as Error).message}</p>
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title="Nada pendiente" body="No hay reclamos por revisar." />
      ) : (
        <div className="divide-y divide-border/60 border-y border-border">
          {q.data!.map((c) => (
            <Row key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
