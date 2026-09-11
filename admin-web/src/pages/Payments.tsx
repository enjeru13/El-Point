import { useState } from "react";
import { Banknote, Bitcoin, Landmark } from "lucide-react";
import { METHOD_LABEL, usePendingPayments, useResolvePayment, type PendingPayment } from "../lib/queries/payments";
import { Badge, Button, EmptyState, PageHeader, PageLoading, StripeCard, timeAgo } from "../components/ui";

const METHOD_ICON = { bs_bcv: Banknote, binance: Bitcoin, bancolombia: Landmark } as const;

function Row({ p }: { p: PendingPayment }) {
  const resolve = useResolvePayment();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const Icon = METHOD_ICON[p.method];

  return (
    <StripeCard tone="brand" className="flex flex-col gap-4 py-5 pr-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
          {p.proof_url ? (
            <a href={p.proof_url} target="_blank" rel="noreferrer">
              <img src={p.proof_url} alt="Comprobante" className="h-14 w-14 object-cover" />
            </a>
          ) : (
            <Icon className="h-6 w-6 text-text-soft" strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-bold text-text">{p.restaurant_name}</p>
            <Badge>{p.owner_name}</Badge>
            <Badge tone="brand">{METHOD_LABEL[p.method]}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-soft">
            Ref. {p.reference}
            {p.amount != null && ` · ${p.amount} USD`}
          </p>
          <p className="mt-0.5 text-xs text-text-soft">{timeAgo(p.submitted_at)}</p>
        </div>
      </div>

      {rejecting ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3">
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo del rechazo (se lo mostramos al dueño)…"
            className="min-h-16 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejecting(false)}>Cancelar</Button>
            <Button
              variant="danger"
              loading={resolve.isPending}
              onClick={() =>
                resolve.mutate(
                  { paymentId: p.id, action: "reject", note: note.trim() || undefined },
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
          <Button variant="secondary" onClick={() => setRejecting(true)} disabled={resolve.isPending}>
            Rechazar
          </Button>
          <Button loading={resolve.isPending} onClick={() => resolve.mutate({ paymentId: p.id, action: "approve" })}>
            Aprobar · +1 año
          </Button>
        </div>
      )}
    </StripeCard>
  );
}

export function Payments() {
  const q = usePendingPayments();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Suscripciones"
        title="Pagos"
        body="Comprobantes de Bs BCV, Binance y Bancolombia esperando revisión."
      />

      {q.isLoading ? (
        <PageLoading />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon={Banknote} title="Sin pagos pendientes" body="Nada esperando verificación ahora mismo." />
      ) : (
        <div className="flex flex-col gap-4">
          {q.data!.map((p) => (
            <Row key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
