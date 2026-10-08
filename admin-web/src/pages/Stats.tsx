import { useMemo, useState } from "react";
import { CalendarDays, Star, Store, TrendingUp, Trophy, Users, type LucideIcon } from "lucide-react";
import { useGrowthStats, useTotals, type WeekPoint } from "../lib/queries/stats";
import { Card, PageHeader, PageLoading } from "../components/ui";
import { AreaChart, Delta, Sparkline, type Point } from "../components/charts";

type SeriesKey = "users" | "restaurants" | "reviews";

const SERIES: Record<
  SeriesKey,
  { label: string; singular: string; icon: LucideIcon; color: string; pick: (w: WeekPoint) => number }
> = {
  users: { label: "Usuarios", singular: "usuarios nuevos", icon: Users, color: "var(--brand)", pick: (w) => w.new_users },
  restaurants: { label: "Locales", singular: "locales nuevos", icon: Store, color: "var(--good)", pick: (w) => w.new_restaurants },
  reviews: { label: "Reseñas", singular: "reseñas nuevas", icon: TrendingUp, color: "var(--gold)", pick: (w) => w.new_reviews },
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

function Segmented<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            o.value === value ? "bg-brand text-white shadow-sm" : "text-text-soft hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function KpiCard({
  seriesKey,
  total,
  now,
  before,
  values,
  active,
  onSelect,
}: {
  seriesKey: SeriesKey;
  total: number;
  now: number;
  before: number;
  values: number[];
  active: boolean;
  onSelect: () => void;
}) {
  const s = SERIES[seriesKey];
  const Icon = s.icon;
  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      className={`flex flex-col gap-3 rounded-2xl border bg-surface p-5 text-left transition ${
        active ? "border-transparent shadow-[0_0_0_2px_var(--brand)]" : "border-border hover:border-text-soft/40"
      }`}
    >
      <div className="flex items-center gap-2 text-text-soft">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklab, ${s.color} 16%, transparent)`, color: s.color }}>
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <span className="text-xs font-bold uppercase tracking-wide">{s.label}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-4xl font-extrabold leading-none tabular-nums text-text">{total}</p>
          <p className="mt-1.5 text-xs text-text-soft">
            <span className="font-bold text-text">+{now}</span> en el periodo
          </p>
        </div>
        <div className="w-24 shrink-0">
          <Sparkline values={values} color={s.color} />
        </div>
      </div>
      <Delta now={now} before={before} />
    </button>
  );
}

function Insight({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-soft">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-text-soft">{label}</p>
        <p className="font-display text-xl font-extrabold tabular-nums text-text">{value}</p>
        <p className="text-xs text-text-soft">{hint}</p>
      </div>
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
        <PageHeader eyebrow="Crecimiento" title="Estadísticas" body="Cómo crece El Point, semana a semana." />
        <Segmented value={weeks} onChange={setWeeks} options={PERIODS.map((p) => ({ value: p.weeks, label: p.label }))} />
      </div>

      {loading ? (
        <PageLoading />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(Object.keys(SERIES) as SeriesKey[]).map((k) => {
              const pick = SERIES[k].pick;
              return (
                <KpiCard
                  key={k}
                  seriesKey={k}
                  total={totals[k]}
                  now={current.reduce((a, w) => a + pick(w), 0)}
                  before={previous.reduce((a, w) => a + pick(w), 0)}
                  values={current.map(pick)}
                  active={k === key}
                  onSelect={() => setKey(k)}
                />
              );
            })}
          </div>

          <Card className="p-5 sm:p-6">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold text-text">{mode === "weekly" ? `Nuevos ${s.label.toLowerCase()} por semana` : `${s.label} en total`}</p>
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
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Insight
                  icon={Trophy}
                  label="Mejor semana"
                  value={sum === 0 ? "—" : String(values[bestIdx])}
                  hint={sum === 0 ? "Sin datos" : weekRange(current[bestIdx].week_start)}
                />
                <Insight icon={TrendingUp} label="Promedio semanal" value={avg.toFixed(1)} hint={`${s.singular} por semana`} />
                <Insight icon={CalendarDays} label="Semanas con actividad" value={`${activeWeeks} de ${weeks}`} hint="al menos 1 nuevo" />
              </div>
            </Card>
            <Card className="flex items-center gap-4 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <Star className="h-6 w-6" strokeWidth={2} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-text-soft">Calificación media</p>
                <p className="font-display text-3xl font-extrabold tabular-nums text-text">{t?.avgRating ? t.avgRating.toFixed(2) : "—"}</p>
                <p className="text-xs text-text-soft">{t?.restaurantsApproved ?? 0} locales aprobados</p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
