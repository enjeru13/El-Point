// Opening hours. `days` is indexed by JS getDay(): 0 = Sunday … 6 = Saturday.
// One interval per day. `close` < `open` means it runs past midnight.

export type DayHours = { closed: boolean; open: string; close: string };
/** `closedToday`: cierre puntual de hoy; se calcula al leer, no se guarda dentro del horario. */
export type Hours = { days: DayHours[]; closedToday?: boolean };

export const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DAY_LABELS_LONG = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const DEFAULT_HOURS: Hours = {
  days: [
    { closed: true, open: "12:00", close: "22:00" }, // Dom
    { closed: false, open: "12:00", close: "22:00" }, // Lun
    { closed: false, open: "12:00", close: "22:00" },
    { closed: false, open: "12:00", close: "22:00" },
    { closed: false, open: "12:00", close: "22:00" },
    { closed: false, open: "12:00", close: "23:00" }, // Vie
    { closed: false, open: "12:00", close: "23:00" }, // Sáb
  ],
};

export function parseHours(raw: unknown): Hours | null {
  if (!raw || typeof raw !== "object") return null;
  const days = (raw as any).days;
  if (!Array.isArray(days) || days.length !== 7) return null;
  return {
    days: days.map((d) => ({
      closed: !!d?.closed,
      open: typeof d?.open === "string" ? d.open : "12:00",
      close: typeof d?.close === "string" ? d.close : "22:00",
    })),
    closedToday: !!(raw as any).closedToday,
  };
}

/** Fecha de hoy en Caracas (YYYY-MM-DD). */
export function caracasToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
}

/** Si el local marcó "hoy no abrimos" para hoy, el día de hoy queda cerrado. */
export function withClosedToday(hours: Hours | null, date: string | null | undefined): Hours | null {
  if (!hours || !date || date !== caracasToday()) return hours;
  const dow = new Date().getDay();
  return { days: hours.days.map((d, i) => (i === dow ? { ...d, closed: true } : d)), closedToday: true };
}

/** Abierto las 24 horas: de 00:00 a 23:59. */
export function is24h(d: DayHours): boolean {
  return !d.closed && d.open === "00:00" && (d.close === "23:59" || d.close === "24:00");
}

export const OPEN_24H = { open: "00:00", close: "23:59" } as const;

const GROUP_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * La semana agrupada: los días seguidos con el mismo horario van juntos.
 * Ej.: "Lun–Vie · 12:00 p. m. – 10:00 p. m.", "Dom · Cerrado".
 */
export function groupDays(hours: Hours): { label: string; range: string; days: number[] }[] {
  const same = (a: DayHours, b: DayHours) => a.closed === b.closed && (a.closed || (a.open === b.open && a.close === b.close));
  const groups: { days: number[] }[] = [];
  for (const dow of GROUP_ORDER) {
    const last = groups[groups.length - 1];
    if (last && same(hours.days[last.days[0]], hours.days[dow])) last.days.push(dow);
    else groups.push({ days: [dow] });
  }
  return groups.map((g) => ({
    days: g.days,
    label: g.days.length === 1 ? DAY_LABELS[g.days[0]] : `${DAY_LABELS[g.days[0]]}–${DAY_LABELS[g.days[g.days.length - 1]]}`,
    range: formatRange(hours.days[g.days[0]]),
  }));
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** "20:30" -> "8:30 p. m." (Spanish 12-hour). */
export function to12h(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(":").map(Number);
  const h = hRaw || 0;
  const m = mRaw || 0;
  const period = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Every 15 minutes as "HH:MM", for a picker. */
export const TIME_SLOTS: string[] = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

export type OpenState = { open: boolean; label: string };

export function isOpenNow(raw: unknown, now = new Date()): OpenState {
  const hours = parseHours(raw);
  if (!hours) return { open: false, label: "Horario no disponible" };

  const dow = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = hours.days[dow];

  // Also consider yesterday's overnight interval spilling into today.
  const yest = hours.days[(dow + 6) % 7];
  if (
    !yest.closed &&
    toMin(yest.close) < toMin(yest.open) &&
    nowMin < toMin(yest.close)
  ) {
    return { open: true, label: `Abierto · cierra ${to12h(yest.close)}` };
  }

  if (!today.closed) {
    const o = toMin(today.open);
    const c = toMin(today.close);
    const overnight = c < o;
    const isOpen = overnight ? nowMin >= o : nowMin >= o && nowMin < c;
    if (isOpen) return { open: true, label: `Abierto · cierra ${to12h(today.close)}` };
    if (nowMin < o)
      return { open: false, label: `Cerrado · abre hoy ${to12h(today.open)}` };
  }

  // Find the next day that opens.
  const closedWord = hours.closedToday ? "Cerrado hoy" : "Cerrado";
  for (let i = 1; i <= 7; i++) {
    const d = hours.days[(dow + i) % 7];
    if (!d.closed) {
      const when =
        i === 1 ? "mañana" : DAY_LABELS_LONG[(dow + i) % 7].toLowerCase();
      return { open: false, label: `${closedWord} · abre ${when} ${to12h(d.open)}` };
    }
  }
  return { open: false, label: closedWord };
}

export function formatRange(d: DayHours): string {
  if (d.closed) return "Cerrado";
  if (is24h(d)) return "Abierto las 24 horas";
  return `${to12h(d.open)} – ${to12h(d.close)}`;
}
