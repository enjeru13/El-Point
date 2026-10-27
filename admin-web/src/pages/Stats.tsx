import { useMemo, useState } from "react";
import { useGrowthStats, useTotals, type WeekPoint } from "../lib/queries/stats";
import { PageHeader, PageLoading, Segmented } from "../components/ui";
import { AreaChart, Delta, type Point } from "../components/charts";

type SeriesKey = "users" | "restaurants" | "reviews";

const SERIES: Record<
  SeriesKey,
  { label: string; singular: string; color: string; pick: (w: WeekPoint) => number }
> = {
  users: { label: "Usuarios", singular: "usuarios nuevos", color: "var(--brand)", pick: (w) => w.new_users },
  restaurants: { label: "Locales", singular: "locales nuevos", color: "var(--good)", pick: (w) => w.new_restaurants },
  reviews: { label: "Reseñas", singular: "reseñas nuevas", color: "var(--gold)", pick: (w) => w.new_reviews },
};

const PERIODS = [
  { weeks: 8, label: "8 semanas" },
  { weeks: 12, label: "12 semanas" },
  { weeks: 26, label: "6 meses" },
  { weeks: 52, label: "1 año" },
];

function weekLabel(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

function weekRange(iso: string): string {
  const a = new Date(iso + "T00:00:00");
  const b = new Date(a.getTime() + 6 * 86_400_000);
  const f = (d: Date) => d.toLocaleDateString("es-VE", { day: "numeric", month: "short" });
  return `${f(a)} – ${f(b)}`;
}

function KpiCard({
  seriesKey,
  total,
  now,
  before,
  active,
  onSelect,
}: {
  seriesKey: SeriesKey;
  total: number;
  now: number;
  before: number;
  active: boolean;
  onSelect: () => void;
}) {
  const s = SERIES[seriesKey];
  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      className={`flex flex-col gap-1 border-t pt-3 text-left transition-colors ${active ? "border-brand" : "border-border hover:border-text-soft"}`}
    >
      <span className={`text-xs font-medium ${active ? "text-text" : "text-text-soft"}`}>{s.label}</span>
      <span className="text-2xl font-semibold tabular-nums text-text">{total}</span>
      <span className="text-xs text-text-soft">
        <span className="font-semibold text-text">+{now}</span> en el periodo
      </span>
      <Delta now={now} before={before} />
    </button>
  );
}

function Insight({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-text-soft">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-text">{value}</p>
      <p className="text-xs text-text-soft">{hint}</p>
    </div>
  );
}

export function Stats() {
  const [weeks, setWeeks] = useState(12);
  const [key, setKey] = useState<SeriesKey>("users");
  const [mode, setMode] = useState<"weekly" | "total">("weekly");

  const totalsQ = useTotals();
  // Se piden 2 periodos para poder comparar contra el anterior.
  const growthQ = useGrowthStats(weeks * 2);

  const t = totalsQ.data;
  const all = growthQ.data ?? [];
  const current = all.slice(-weeks);
  const previous = all.slice(-weeks * 2, -weeks);

  const totals: Record<SeriesKey, number> = {
    users: t?.users ?? 0,
    restaurants: t?.restaurantsTotal ?? 0,
    reviews: t?.reviews ?? 0,
  };

  const chart = useMemo<Point[]>(() => {
    const s = SERIES[key];
    const weekly = current.map((w) => ({ label: weekLabel(w.week_start), range: weekRange(w.week_start), value: s.pick(w) }));
    if (mode === "weekly") return weekly.map((w) => ({ label: w.label, value: w.value }));
    // Acumulado: se parte del total actual y se resta hacia atrás.
    let running = totals[key];
    const out: Point[] = [];
    for (let i = weekly.length - 1; i >= 0; i--) {
      out.unshift({ label: weekly[i].label, value: running });
      running -= weekly[i].value;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, key, mode, t]);

  const s = SERIES[key];
  const values = current.map(s.pick);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = values.length ? sum / values.length : 0;
  const bestIdx = values.reduce((bi, v, i) => (v > values[bi] ? i : bi), 0);
  const activeWeeks = values.filter((v) => v > 0).length;

  const loading = totalsQ.isLoading || growthQ.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Estadísticas" body="Cómo crece El Point, semana a semana." />
        <Segmented value={weeks} onChange={setWeeks} options={PERIODS.map((p) => ({ value: p.weeks, label: p.label }))} />
      </div>

      {loading ? (
        <PageLoading />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
            {(Object.keys(SERIES) as SeriesKey[]).map((k) => {
              const pick = SERIES[k].pick;
              return (
                <KpiCard
                  key={k}
                  seriesKey={k}
                  total={totals[k]}
                  now={current.reduce((a, w) => a + pick(w), 0)}
                  before={previous.reduce((a, w) => a + pick(w), 0)}
                  active={k === key}
                  onSelect={() => setKey(k)}
                />
              );
            })}
          </div>

          <section>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text">{mode === "weekly" ? `Nuevos ${s.label.toLowerCase()} por semana` : `${s.label} en total`}</p>
                <p className="text-sm text-text-soft">
                  {mode === "weekly"
                    ? `${sum} ${s.singular} en ${weeks} semanas. Pasa el cursor por la gráfica para ver cada semana.`
                    : "Cuánto había acumulado al cierre de cada semana."}
                </p>
              </div>
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: "weekly", label: "Por semana" },
                  { value: "total", label: "Acumulado" },
                ]}
              />
            </div>
            {sum === 0 && mode === "weekly" ? (
              <div className="flex h-60 items-center justify-center text-sm text-text-soft">Sin actividad en este periodo.</div>
            ) : (
              <AreaChart data={chart} color={s.color} unit={mode === "weekly" ? s.label.toLowerCase() : ""} />
            )}
          </section>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5 sm:grid-cols-4">
            <Insight
              label="Mejor semana"
              value={sum === 0 ? "—" : String(values[bestIdx])}
              hint={sum === 0 ? "Sin datos" : weekRange(current[bestIdx].week_start)}
            />
            <Insight label="Promedio semanal" value={avg.toFixed(1)} hint={`${s.singular} por semana`} />
            <Insight label="Semanas con actividad" value={`${activeWeeks} de ${weeks}`} hint="al menos 1 nuevo" />
            <Insight label="Calificación media" value={t?.avgRating ? t.avgRating.toFixed(2) : "—"} hint={`${t?.restaurantsApproved ?? 0} locales aprobados`} />
          </div>
        </>
      )}
    </div>
  );
}
