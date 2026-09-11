import { useState } from "react";
import { LifeBuoy, Mail } from "lucide-react";
import { useResolveSupportMessage, useSupportMessages, type SupportMessage } from "../lib/queries/support";
import { Badge, Button, EmptyState, PageHeader, PageLoading, StripeCard, timeAgo } from "../components/ui";

function Row({ m, isOpen }: { m: SupportMessage; isOpen: boolean }) {
  const resolve = useResolveSupportMessage();

  return (
    <StripeCard tone={isOpen ? "brand" : "neutral"} className="flex flex-col gap-3 py-5 pr-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-display text-base font-bold text-text">{m.subject}</p>
        <Badge>{m.author_name}</Badge>
        <span className="text-xs text-text-soft">{timeAgo(m.created_at)}</span>
      </div>
      <p className="text-sm text-text-soft">{m.body}</p>
      {m.email && (
        <p className="inline-flex items-center gap-1.5 text-xs text-text-soft">
          <Mail className="h-3.5 w-3.5" strokeWidth={2} />
          Responder a: {m.email}
        </p>
      )}

      <div className="flex justify-end">
        {isOpen ? (
          <Button loading={resolve.isPending} onClick={() => resolve.mutate({ id: m.id, status: "closed" })}>
            Marcar resuelto
          </Button>
        ) : (
          <Button
            variant="secondary"
            loading={resolve.isPending}
            onClick={() => resolve.mutate({ id: m.id, status: "open" })}
          >
            Reabrir
          </Button>
        )}
      </div>
    </StripeCard>
  );
}

export function Support() {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const q = useSupportMessages(tab);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Contacto" title="Soporte" body="Mensajes que los usuarios mandan desde la app." />

      <div className="flex gap-1 self-start rounded-full border border-border bg-surface-2 p-1">
        {(["open", "closed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === t ? "bg-brand text-white" : "text-text-soft hover:text-text"
            }`}
          >
            {t === "open" ? "Abiertos" : "Resueltos"}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <PageLoading />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon={LifeBuoy} title={tab === "open" ? "Sin mensajes abiertos" : "Sin mensajes resueltos"} />
      ) : (
        <div className="flex flex-col gap-4">
          {q.data!.map((m) => (
            <Row key={m.id} m={m} isOpen={tab === "open"} />
          ))}
        </div>
      )}
    </div>
  );
}
