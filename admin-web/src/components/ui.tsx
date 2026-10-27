import { Loader2, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Contenedor plano: un borde fino, sin sombra. Úsalo solo cuando agrupar ayude. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-surface ${className}`}>{children}</div>;
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-brand text-white hover:bg-brand-2",
    secondary: "border border-border text-text hover:bg-surface-2",
    danger: "bg-danger text-white hover:brightness-110",
    ghost: "text-text-soft hover:text-text",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner /> : children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`h-4 w-4 animate-spin ${className}`} aria-hidden />;
}

type BadgeTone = "neutral" | "brand" | "danger" | "good" | "warn";

/** Estado en una palabra: texto con un tinte suave, sin borde. */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  const styles: Record<BadgeTone, string> = {
    neutral: "bg-surface-2 text-text-soft",
    brand: "bg-brand/10 text-brand",
    danger: "bg-danger/10 text-danger",
    good: "bg-good/10 text-good",
    warn: "bg-gold/15 text-gold",
  };
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-16 text-center">
      <p className="text-sm font-semibold text-text">{title}</p>
      {body && <p className="max-w-xs text-sm text-text-soft">{body}</p>}
    </div>
  );
}

export function PageHeader({ title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
      {body && <p className="mt-1 text-sm text-text-soft">{body}</p>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24 text-text-soft">
      <Spinner className="h-5 w-5" />
    </div>
  );
}

export function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  const w = Math.floor(d / 7);
  if (w < 5) return `hace ${w} sem`;
  return `hace ${Math.floor(d / 30)} mes`;
}

/** Pestañas subrayadas, con contador opcional. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; badge?: number }[];
}) {
  return (
    <div className="flex w-full gap-6 overflow-x-auto border-b border-border" role="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors ${
              on ? "border-brand text-text" : "border-transparent text-text-soft hover:text-text"
            }`}
          >
            {o.label}
            {!!o.badge && <span className="text-xs font-semibold tabular-nums text-brand">{o.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Opciones en línea para filtrar o cambiar de periodo: texto, el activo con fondo suave. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
            o.value === value ? "bg-surface-2 text-text" : "text-text-soft hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Un indicador: etiqueta pequeña, número y una línea de contexto. Sin íconos ni cajas. */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "brand" | "good" | "danger" | "neutral";
}) {
  return (
    <div className="min-w-0 border-t border-border pt-3">
      <p className="truncate text-xs font-medium text-text-soft">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "danger" && value ? "text-danger" : "text-text"}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-text-soft">{hint}</p>}
    </div>
  );
}

export const INPUT =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-soft focus:border-brand";

/** Igual que INPUT pero sin ancho fijo: para selects y campos cortos en una fila. */
export const INPUT_AUTO =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-brand";
