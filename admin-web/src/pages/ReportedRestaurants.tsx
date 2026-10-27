import { Link } from "react-router-dom";
import { useReportedRestaurants, useResolveRestaurantReport, type ReportedRestaurant } from "../lib/queries/admin";
import { reasonLabel, RESTAURANT_REPORT_REASONS } from "../lib/reasons";
import { Badge, Button, EmptyState, PageHeader, PageLoading, timeAgo } from "../components/ui";

function Row({ r }: { r: ReportedRestaurant }) {
  const resolve = useResolveRestaurantReport();

  return (
    <div className="flex flex-col gap-4 px-1 py-5 sm:px-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-text">{r.name}</p>
          <Badge>{r.owner_name}</Badge>
          <Badge tone="danger">
            {r.reports.length > 0 ? `${r.reports.length} ${r.reports.length === 1 ? "reporte" : "reportes"}` : "Suspendido por el equipo"}
          </Badge>
          {r.ghost_kitchen && <Badge>Cocina fantasma</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-text-soft">
          {r.ghost_kitchen ? (r.zone_label ?? "Sin zona indicada") : (r.address ?? "Sin dirección")}
        </p>
        {r.status_reason && <p className="mt-1 text-xs text-text-soft">Motivo de suspensión: {r.status_reason}</p>}
      </div>

      {r.reports.length > 0 && (
        <ul className="flex flex-col gap-2">
          {r.reports.map((rep, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-text">{reasonLabel(RESTAURANT_REPORT_REASONS, rep.reason)}</span>
              <span className="ml-2 text-xs text-text-soft">{timeAgo(rep.created_at)}</span>
              {rep.note && <p className="text-text-soft">{rep.note}</p>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <Link to={`/locales/${r.id}`}>
          <Button variant="ghost">Ver ficha</Button>
        </Link>
        <Button variant="danger" loading={resolve.isPending} onClick={() => resolve.mutate({ restaurantId: r.id, action: "remove" })}>
          Retirar definitivo
        </Button>
        <Button loading={resolve.isPending} onClick={() => resolve.mutate({ restaurantId: r.id, action: "restore" })}>
          Restaurar local
        </Button>
      </div>
    </div>
  );
}

export function ReportedRestaurants() {
  const q = useReportedRestaurants();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Locales suspendidos"
        body="Suspendidos por reportes de comensales o por el equipo. Reactiva los que estén bien o retira los que no."
      />

      {q.isLoading ? (
        <PageLoading />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title="Sin locales suspendidos" body="Ningún local esperando revisión." />
      ) : (
        <div className="divide-y divide-border/60 border-y border-border">
          {q.data!.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
