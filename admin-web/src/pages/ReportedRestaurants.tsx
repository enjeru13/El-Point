import { useReportedRestaurants, useResolveRestaurantReport, type ReportedRestaurant } from "../lib/queries/admin";
import { reasonLabel, RESTAURANT_REPORT_REASONS } from "../lib/reasons";
import { Badge, Button, Card, EmptyState, PageLoading, timeAgo } from "../components/ui";

function Row({ r }: { r: ReportedRestaurant }) {
  const resolve = useResolveRestaurantReport();

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-display text-base font-bold text-text">{r.name}</p>
          <Badge>{r.owner_name}</Badge>
          <Badge tone="danger">{r.reports.length} {r.reports.length === 1 ? "reporte" : "reportes"}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-text-soft">{r.address ?? "Sin dirección"}</p>
        {r.status_reason && (
          <p className="mt-1 text-xs text-text-soft">Motivo de suspensión: {r.status_reason}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3">
        {r.reports.map((rep, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold text-text">{reasonLabel(RESTAURANT_REPORT_REASONS, rep.reason)}</span>
            <span className="ml-2 text-xs text-text-soft">{timeAgo(rep.created_at)}</span>
            {rep.note && <p className="text-text-soft">{rep.note}</p>}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="danger"
          loading={resolve.isPending}
          onClick={() => resolve.mutate({ restaurantId: r.id, action: "remove" })}
        >
          Retirar definitivo
        </Button>
        <Button loading={resolve.isPending} onClick={() => resolve.mutate({ restaurantId: r.id, action: "restore" })}>
          Restaurar local
        </Button>
      </div>
    </Card>
  );
}

export function ReportedRestaurants() {
  const q = useReportedRestaurants();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Locales reportados</h1>
        <p className="mt-1 text-text-soft">Suspendidos automáticamente por reportes de comensales.</p>
      </div>

      {q.isLoading ? (
        <PageLoading />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title="Sin reportes pendientes" body="Ningún local suspendido esperando revisión." />
      ) : (
        <div className="flex flex-col gap-4">
          {q.data!.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
