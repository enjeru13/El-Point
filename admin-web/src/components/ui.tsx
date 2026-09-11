import { Inbox, Loader2, type LucideIcon } from "lucide-react";
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

/** Card variant for queue/report rows: a colored left stripe encodes state
 *  (severity, status) instead of stacking badges — same info, one glance. */
export function StripeCard({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: "neutral" | "brand" | "danger";
  children: ReactNode;
  className?: string;
}) {
  const stripe: Record<string, string> = {
    neutral: "before:bg-border",
    brand: "before:bg-brand",
    danger: "before:bg-danger",
  };
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-surface pl-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] before:absolute before:inset-y-0 before:left-0 before:w-1.5 ${stripe[tone]} ${className}`}
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
  return <Loader2 className={`h-4 w-4 animate-spin ${className}`} aria-hidden />;
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

export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
      <Icon className="mb-1 h-8 w-8 text-text-soft" strokeWidth={1.5} aria-hidden />
      <p className="font-display text-base font-bold text-text">{title}</p>
      {body && <p className="max-w-xs text-sm text-text-soft">{body}</p>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-brand">{eyebrow}</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text">{title}</h1>
      {body && <p className="mt-1.5 text-text-soft">{body}</p>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24 text-text-soft">
      <Spinner className="h-6 w-6" />
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
