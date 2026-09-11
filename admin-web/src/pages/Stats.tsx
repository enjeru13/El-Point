import { Star, Store, TrendingUp, Users } from "lucide-react";
import { useGrowthStats, useTotals, type WeekPoint } from "../lib/queries/stats";
import { Card, PageHeader, PageLoading } from "../components/ui";

function TotalTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div>
        <p className="font-display text-2xl font-extrabold tabular-nums text-text">{value}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">{label}</p>
      </div>
    </Card>
  );
}

function weekLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

function GrowthChart({
  title,
  data,
  pick,
  color,
}: {
  title: string;
  data: WeekPoint[];
  pick: (w: WeekPoint) => number;
  color: string;
}) {
  const values = data.map(pick);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const BAR_H = 110;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="font-display text-base font-bold text-text">{title}</p>
        <p className="text-sm text-text-soft">
          <span className="font-display text-lg font-extrabold tabular-nums text-text">{total}</span> en {data.length} semanas
        </p>
      </div>
      {total === 0 ? (
        <div className="flex h-[110px] items-center justify-center text-sm text-text-soft">Sin actividad todavía.</div>
      ) : (
        <div className="flex items-end gap-1.5" style={{ height: BAR_H + 28 }}>
          {data.map((w, i) => {
            const v = pick(w);
            const h = v === 0 ? 2 : Math.max(6, (v / max) * BAR_H);
            const isLast = i === data.length - 1;
            return (
              <div key={w.week_start} className="flex flex-1 flex-col items-center gap-1.5" title={`${weekLabel(w.week_start)}: ${v}`}>
                <span className="text-[10px] tabular-nums text-text-soft">{v > 0 ? v : ""}</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: h,
                    backgroundColor: isLast ? color : `color-mix(in oklab, ${color} 55%, transparent)`,
                  }}
                />
                {(i === 0 || isLast || i === Math.floor(data.length / 2)) && (
                  <span className="text-[10px] text-text-soft">{weekLabel(w.week_start)}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function Stats() {
  const totalsQ = useTotals();
  const growthQ = useGrowthStats(12);

  const loading = totalsQ.isLoading || growthQ.isLoading;
  const t = totalsQ.data;
  const data = growthQ.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Crecimiento"
        title="Estadísticas"
        body="El pulso real de la app, sin ir a buscarlo al dashboard de Supabase."
      />

      {loading ? (
        <PageLoading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <TotalTile icon={Users} label="Usuarios" value={String(t?.users ?? 0)} />
            <TotalTile icon={Store} label="Locales aprobados" value={String(t?.restaurantsApproved ?? 0)} />
            <TotalTile icon={Store} label="Locales totales" value={String(t?.restaurantsTotal ?? 0)} />
            <TotalTile icon={TrendingUp} label="Reseñas" value={String(t?.reviews ?? 0)} />
            <TotalTile icon={Star} label="Calificación media" value={t?.avgRating ? t.avgRating.toFixed(2) : "—"} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <GrowthChart title="Usuarios nuevos" data={data} pick={(w) => w.new_users} color="var(--brand)" />
            <GrowthChart title="Locales nuevos" data={data} pick={(w) => w.new_restaurants} color="var(--good)" />
            <GrowthChart title="Reseñas nuevas" data={data} pick={(w) => w.new_reviews} color="var(--gold)" />
          </div>
        </>
      )}
    </div>
  );
}
