import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
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
    "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-brand text-white hover:brightness-110",
    secondary: "bg-surface-2 text-text border border-border hover:brightness-95",
    danger: "bg-danger text-white hover:brightness-110",
    ghost: "text-text-soft hover:text-text",
  };
  return (
    <button
      className={`${base} ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type BadgeTone = "neutral" | "brand" | "danger" | "good";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  const styles: Record<BadgeTone, string> = {
    neutral: "bg-surface-2 text-text-soft border-border",
    brand: "bg-brand/10 text-brand border-brand/30",
    danger: "bg-danger/10 text-danger border-danger/30",
    good: "bg-good/10 text-good border-good/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border py-16 text-center">
      <p className="font-display text-base font-bold text-text">{title}</p>
      {body && <p className="max-w-xs text-sm text-text-soft">{body}</p>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24 text-text-soft">
      <Spinner />
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
