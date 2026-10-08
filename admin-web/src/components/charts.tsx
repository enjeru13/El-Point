import { useId, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export type Point = { label: string; value: number };

/** Redondea el máximo a un número "bonito" para que los ticks del eje no sean raros. */
function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Línea suave que pasa por todos los puntos (Catmull-Rom a Bézier). */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    // Los puntos de control no pasan de la altura de sus vecinos: la curva no se hunde bajo 0 ni se pasa del máximo.
    const lo = Math.min(p1[1], p2[1]);
    const hi = Math.max(p1[1], p2[1]);
    const clamp = (v: number) => Math.min(hi, Math.max(lo, v));
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/**
 * Gráfico de área con ejes, líneas guía y tooltip al pasar el cursor (o tocar).
 * `color` es cualquier color CSS; el relleno usa el mismo color con degradado.
 */
export function AreaChart({
  data,
  color,
  height = 260,
  unit = "",
  format = (n: number) => String(Math.round(n * 100) / 100),
}: {
  data: Point[];
  color: string;
  height?: number;
  unit?: string;
  format?: (n: number) => string;
}) {
  const uid = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = height;
  const pad = { l: 40, r: 16, t: 16, b: 30 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const x = (i: number) => pad.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;

  const pts: [number, number][] = data.map((d, i) => [x(i), y(d.value)]);
  const line = smoothPath(pts);
  const area = pts.length > 1 ? `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r || data.length === 0) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / innerW) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  }

  const h = hover ?? data.length - 1;
  const hp = data[h];

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y select-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Gráfico de evolución"
      >
        <defs>
          <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.32" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "3 5"} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="9.5" fill="var(--text-soft)" className="tabular-nums">
              {format(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={d.label + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="var(--text-soft)">
              {d.label}
            </text>
          ) : null,
        )}

        {area && <path d={area} fill={`url(#g${uid})`} />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

        {hp && (
          <g>
            <line x1={x(h)} x2={x(h)} y1={pad.t} y2={y(0)} stroke={color} strokeOpacity="0.35" strokeDasharray="4 4" />
            <circle cx={x(h)} cy={y(hp.value)} r="9" fill={color} fillOpacity="0.18" />
            <circle cx={x(h)} cy={y(hp.value)} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hp && (
        <div
          className="pointer-events-none absolute top-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-lg"
          style={{
            left: `${(x(h) / W) * 100}%`,
            transform: `translateX(${h > data.length * 0.7 ? "-105%" : h < data.length * 0.3 ? "5%" : "-50%"})`,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-soft">{hp.label}</p>
          <p className="font-display text-lg font-extrabold tabular-nums text-text">
            {format(hp.value)}
            {unit && <span className="ml-1 text-xs font-semibold text-text-soft">{unit}</span>}
          </p>
        </div>
      )}
    </div>
  );
}

/** Mini línea de tendencia para tarjetas de KPI. */
export function Sparkline({ values, color, height = 36 }: { values: number[]; color: string; height?: number }) {
  const uid = useId().replace(/:/g, "");
  const W = 120;
  const max = Math.max(1, ...values);
  const pts: [number, number][] = values.map((v, i) => [
    values.length === 1 ? W / 2 : (i / (values.length - 1)) * W,
    height - 3 - (v / max) * (height - 8),
  ]);
  const line = smoothPath(pts);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {pts.length > 1 && (
        <>
          <path d={`${line} L${W},${height} L0,${height} Z`} fill={`url(#s${uid})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </>
      )}
    </svg>
  );
}

/** Variación contra el periodo anterior: verde si sube, rojo si baja, gris si igual. */
export function Delta({ now, before, suffix = "" }: { now: number; before: number; suffix?: string }) {
  if (before === 0 && now === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-text-soft">
        <Minus className="h-3 w-3" strokeWidth={2.5} /> sin cambios
      </span>
    );
  }
  const diff = now - before;
  const up = diff > 0;
  const same = diff === 0;
  const pct = before === 0 ? null : Math.round((diff / before) * 100);
  const Icon = same ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const tone = same ? "text-text-soft" : up ? "text-good" : "text-danger";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {same ? "igual" : pct === null ? `+${diff}${suffix}` : `${up ? "+" : ""}${pct}%`}
      <span className="ml-1 font-medium text-text-soft">vs. antes</span>
    </span>
  );
}
