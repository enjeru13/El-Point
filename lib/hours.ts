// Opening hours. `days` is indexed by JS getDay(): 0 = Sunday … 6 = Saturday.
// One interval per day. `close` < `open` means it runs past midnight.

export type DayHours = { closed: boolean; open: string; close: string };
export type Hours = { days: DayHours[] };

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
  };
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
  for (let i = 1; i <= 7; i++) {
    const d = hours.days[(dow + i) % 7];
    if (!d.closed) {
      const when =
        i === 1 ? "mañana" : DAY_LABELS_LONG[(dow + i) % 7].toLowerCase();
      return { open: false, label: `Cerrado · abre ${when} ${to12h(d.open)}` };
    }
  }
  return { open: false, label: "Cerrado" };
}

export function formatRange(d: DayHours): string {
  return d.closed ? "Cerrado" : `${to12h(d.open)} – ${to12h(d.close)}`;
}
