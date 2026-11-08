import { useMemo, useState } from "react";
import { useAppUsage, type AppUsage } from "../lib/queries/stats";
import { PageLoading, Segmented } from "../components/ui";
import { AreaChart, type Point } from "../components/charts";

type Platform = "all" | "ios" | "android";
type Metric = "active" | "new";

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "ios", label: "iPhone" },
  { value: "android", label: "Android" },
];

function dayLabel(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

function pick(row: AppUsage["daily"][number], metric: Metric, platform: Platform): number {
  const ios = metric === "active" ? row.active_ios : row.new_ios;
  const android = metric === "active" ? row.active_android : row.new_android;
  return platform === "ios" ? ios : platform === "android" ? android : ios + android;
}

function Kpi({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="flex flex-col gap-1 border-t border-border pt-3">
      <span className="text-xs font-medium text-text-soft">{label}</span>
      <span className="text-2xl font-semibold tabular-nums text-text">{value}</span>
      <span className="text-xs text-text-soft">{detail}</span>
    </div>
  );
}

/** Instalaciones y uso diario, a partir del aviso que manda la app al abrirse. */
export function StatsUsage() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<Metric>("active");
  const [platform, setPlatform] = useState<Platform>("all");
  const q = useAppUsage(days);
  const u = q.data;

  const chart = useMemo<Point[]>(
    () => (u?.daily ?? []).map((r) => ({ label: dayLabel(r.day), value: pick(r, metric, platform) })),
    [u, metric, platform],
  );

  if (q.isLoading) return <PageLoading />;
  if (q.error || !u) {
    return <p className="text-sm text-text-soft">No se pudieron cargar las instalaciones. ¿Ya corriste la migración 20261108000000?</p>;
  }

  const installs = u.installs.ios + u.installs.android;
  const active7 = u.active_7.ios + u.active_7.android;
  const active30 = u.active_30.ios + u.active_30.android;
  const sum = chart.reduce((a, p) => a + p.value, 0);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text">Instalaciones y uso</p>
          <p className="text-sm text-text-soft">Teléfonos que abrieron la app al menos una vez, con o sin cuenta.</p>
        </div>
        <Segmented
          value={days}
          onChange={setDays}
          options={[
            { value: 14, label: "14 días" },
            { value: 30, label: "30 días" },
            { value: 90, label: "90 días" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Kpi label="Instalaciones" value={installs} detail={`${u.installs.ios} iPhone · ${u.installs.android} Android`} />
        <Kpi label="Activos 7 días" value={active7} detail={`${u.active_7.ios} iPhone · ${u.active_7.android} Android`} />
        <Kpi label="Activos 30 días" value={active30} detail={`${u.active_30.ios} iPhone · ${u.active_30.android} Android`} />
        <Kpi
          label="Con cuenta"
          value={u.installs.with_account}
          detail={`${u.push_enabled} con notificaciones activadas`}
        />
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <Segmented
            value={metric}
            onChange={setMetric}
            options={[
              { value: "active", label: "Activos por día" },
              { value: "new", label: "Instalaciones nuevas" },
            ]}
          />
          <Segmented value={platform} onChange={setPlatform} options={PLATFORMS} />
        </div>
        {sum === 0 ? (
          <div className="flex h-60 items-center justify-center text-sm text-text-soft">Sin datos todavía en este periodo.</div>
        ) : (
          <AreaChart
            data={chart}
            color={platform === "android" ? "var(--good)" : "var(--brand)"}
            unit={metric === "active" ? "activos" : "nuevas"}
          />
        )}
      </div>

      {u.versions.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium text-text-soft">Versiones en uso (últimos 30 días)</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {u.versions.map((v) => (
              <span key={`${v.platform}-${v.version}`} className="tabular-nums text-text">
                {v.platform === "ios" ? "iPhone" : "Android"} {v.version}:{" "}
                <span className="font-semibold">{v.installs}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
