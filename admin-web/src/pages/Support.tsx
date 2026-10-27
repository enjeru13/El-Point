import { useState } from "react";
import { useResolveSupportMessage, useSupportMessages, type SupportMessage } from "../lib/queries/support";
import { Badge, Button, EmptyState, PageHeader, PageLoading, Segmented, timeAgo } from "../components/ui";

function Row({ m, isOpen }: { m: SupportMessage; isOpen: boolean }) {
  const resolve = useResolveSupportMessage();

  return (
    <div className="flex flex-col gap-3 px-1 py-5 sm:px-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-text">{m.subject}</p>
        <Badge>{m.author_name}</Badge>
        <span className="text-xs text-text-soft">{timeAgo(m.created_at)}</span>
      </div>
      <p className="text-sm text-text-soft">{m.body}</p>
      {m.email && (
        <p className="text-xs text-text-soft">Responder a: {m.email}</p>
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
    </div>
  );
}

export function Support() {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const q = useSupportMessages(tab);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Soporte" body="Mensajes que los usuarios mandan desde la app." />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "open", label: "Abiertos" },
          { value: "closed", label: "Resueltos" },
        ]}
      />

      {q.isLoading ? (
        <PageLoading />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title={tab === "open" ? "Sin mensajes abiertos" : "Sin mensajes resueltos"} />
      ) : (
        <div className="divide-y divide-border/60 border-y border-border">
          {q.data!.map((m) => (
            <Row key={m.id} m={m} isOpen={tab === "open"} />
          ))}
        </div>
      )}
    </div>
  );
}
