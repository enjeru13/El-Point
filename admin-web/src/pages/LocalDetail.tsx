import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  Banknote,
  CircleCheck,
  Eye,
  Ghost,
  History,
  MessageCircle,
  PauseCircle,
  Phone,
  ShoppingBag,
  Star,
  type LucideIcon,
} from "lucide-react";
import {
  PLAN_LABEL,
  STATUS_LABEL,
  daysUntil,
  useLocalDetail,
  useLocalStats,
  useSetLocalStatus,
  type LocalPayment,
  type LocalStatus,
  type PlanState,
} from "../lib/queries/locales";
import { METHOD_LABEL, PLAN_LABEL as PAY_PLAN_LABEL, useVoidPayment, type PaymentMethod, type PaymentPlan } from "../lib/queries/payments";
import { fmtDate, fmtMoney, waLink } from "../lib/format";
import { PlanActions } from "../components/PlanActions";
import { Badge, Button, Card, EmptyState, INPUT, PageLoading, StatTile, timeAgo } from "../components/ui";

const STATUS_TONE: Record<LocalStatus, "good" | "brand" | "danger" | "neutral"> = {
  approved: "good",
  pending: "brand",
  suspended: "danger",
  rejected: "neutral",
};
const PLAN_TONE: Record<PlanState, "good" | "brand" | "danger" | "neutral" | "warn"> = {
  founder: "brand",
  active: "good",
  expiring: "warn",
  expired: "danger",
  none: "neutral",
};

function Section({ title, icon: Icon, children, aside }: { title: string; icon?: LucideIcon; children: ReactNode; aside?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-text">
          {Icon && <Icon className="h-4 w-4 text-text-soft" strokeWidth={2} />}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </Card>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-text-soft">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-text">{children}</dd>
    </div>
  );
}

function StatusCard({ id, status, reason, name }: { id: string; status: LocalStatus; reason: string | null; name: string }) {
  const mut = useSetLocalStatus();
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");

  function run(action: "suspend" | "reactivate") {
    mut.mutate({ id, action, reason: why.trim() || undefined }, { onSuccess: () => (setOpen(false), setWhy("")) });
  }

  return (
    <Section title="Estado del local" icon={PauseCircle}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
        {status === "suspended" && reason && <span className="text-sm text-text-soft">{reason}</span>}
      </div>

      {status === "approved" && !open && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-soft">Visible en la app. Si lo suspendes, deja de verse ya y el dueño recibe un aviso con el motivo.</p>
          <div>
            <Button variant="danger" onClick={() => setOpen(true)}>
              Suspender local
            </Button>
          </div>
        </div>
      )}

      {status === "approved" && open && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3">
          <p className="text-sm text-text-soft">
            <strong className="text-text">{name}</strong> dejará de aparecer en el mapa, la búsqueda y el inicio. Su plan y sus datos no se tocan.
          </p>
          <textarea
            autoFocus
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="Motivo (se lo mostramos al dueño)"
            className={`${INPUT} min-h-20 resize-none`}
          />
          {mut.isError && <p className="text-sm text-danger">{(mut.error as Error).message}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={mut.isPending} onClick={() => run("suspend")}>
              Suspender
            </Button>
          </div>
        </div>
      )}

      {status === "suspended" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-soft">Oculto en la app. Al reactivarlo vuelve a verse y el dueño recibe un aviso.</p>
          {mut.isError && <p className="text-sm text-danger">{(mut.error as Error).message}</p>}
          <div>
            <Button loading={mut.isPending} onClick={() => run("reactivate")}>
              Reactivar local
            </Button>
          </div>
        </div>
      )}

      {(status === "pending" || status === "rejected") && (
        <p className="text-sm text-text-soft">
          {status === "pending" ? "Esperando revisión." : "Rechazado."}{" "}
          <Link to="/restaurantes" className="font-semibold text-brand hover:underline">
            Ir a Locales pendientes
          </Link>
        </p>
      )}
    </Section>
  );
}

function PaymentRow({ p }: { p: LocalPayment }) {
  const voidMut = useVoidPayment();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const tone = p.status === "approved" ? "good" : p.status === "pending" ? "brand" : p.status === "voided" ? "danger" : "neutral";
  const label = { approved: "Aprobado", pending: "Por verificar", rejected: "Rechazado", voided: "Anulado" }[p.status];

  return (
    <div className="flex flex-col gap-2 px-1 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge tone={tone}>{label}</Badge>
        <span className="text-sm font-semibold text-text">{p.plan ? PAY_PLAN_LABEL[p.plan as PaymentPlan]?.split(" · ")[0] ?? p.plan : "Plan"}</span>
        <span className="text-sm text-text-soft">
          {METHOD_LABEL[p.method as PaymentMethod] ?? p.method} · ref. {p.reference}
          {p.amount != null && ` · ${fmtMoney(p.amount)}`}
        </span>
        <span className="ml-auto text-xs text-text-soft">{fmtDate(p.submitted_at)}</span>
        {p.status === "approved" && !open && (
          <Button variant="ghost" onClick={() => setOpen(true)}>
            Anular
          </Button>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3">
          <p className="text-sm text-text-soft">Se le resta al local lo que este pago sumó (tiempo de plan y Destacado). El pago queda como anulado.</p>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" className={INPUT} />
          {voidMut.isError && <p className="text-sm text-danger">{(voidMut.error as Error).message}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={voidMut.isPending} onClick={() => voidMut.mutate({ paymentId: p.id, reason: reason.trim() || undefined }, { onSuccess: () => setOpen(false) })}>
              Anular pago
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LocalDetail() {
  const { id } = useParams();
  const q = useLocalDetail(id);
  const statsQ = useLocalStats(id, 30);

  if (q.isLoading) return <PageLoading />;
  if (q.isError || !q.data) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/locales" className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-soft hover:text-text">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Locales
        </Link>
        <EmptyState icon={Ban} title="No se encontró el local" body="Puede que se haya eliminado, o que no tengas acceso." />
      </div>
    );
  }

  const { local: l, contact, payments, timeline } = q.data;
  const stats = statsQ.data ?? {};
  const boosted = !!l.boost_until && new Date(l.boost_until).getTime() > Date.now();
  const left = daysUntil(l.paid_until);
  const contacts = (stats.whatsapp ?? 0) + (stats.call ?? 0) + (stats.instagram ?? 0) + (stats.order ?? 0);
  const wa = waLink(contact.whatsapp);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link to="/locales" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-text-soft hover:text-text">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Locales
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-text">{l.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
              <Badge tone={PLAN_TONE[l.plan]}>{l.plan === "founder" ? `Original #${l.founder_rank}` : PLAN_LABEL[l.plan]}</Badge>
              {boosted && <Badge tone="brand">Destacado hasta {fmtDate(l.boost_until)}</Badge>}
              {l.ghost_kitchen && (
                <Badge>
                  <span className="inline-flex items-center gap-1">
                    <Ghost className="h-3 w-3" strokeWidth={2} /> Cocina fantasma
                  </span>
                </Badge>
              )}
              <span className="text-sm text-text-soft">{l.owner_name}</span>
            </div>
          </div>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer">
              <Button variant="secondary">
                <MessageCircle className="h-4 w-4" strokeWidth={2} /> Escribir por WhatsApp
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Star} label="Calificación" value={l.rating_count > 0 ? l.rating_avg.toFixed(1) : "—"} hint={`${l.rating_count} ${l.rating_count === 1 ? "rank" : "ranks"}`} tone="brand" />
        <StatTile icon={Eye} label="Visitas" value={stats.view ?? 0} hint="últimos 30 días" />
        <StatTile icon={Phone} label="Contactos" value={contacts} hint="WhatsApp, llamadas, Instagram, pedidos" tone="good" />
        <StatTile icon={ShoppingBag} label="Intentos sin contacto" value={stats.blocked ?? 0} hint="tocaron un contacto bloqueado" tone={l.plan === "expired" || l.plan === "none" ? "danger" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Section title="Plan" icon={CircleCheck}>
            <dl className="grid grid-cols-2 gap-4">
              <Fact label="Estado">
                <Badge tone={PLAN_TONE[l.plan]}>{PLAN_LABEL[l.plan]}</Badge>
              </Fact>
              <Fact label={l.plan === "expired" ? "Venció" : "Vence"}>
                {l.plan === "founder" ? "Nunca" : l.paid_until ? `${fmtDate(l.paid_until)}${left != null ? ` (${left >= 0 ? `en ${left} d` : `hace ${Math.abs(left)} d`})` : ""}` : "—"}
              </Fact>
              <Fact label="Destacado">{boosted ? `hasta ${fmtDate(l.boost_until)}` : "No tiene"}</Fact>
              <Fact label="Pedidos por WhatsApp">{l.accepts_orders ? "Activados" : "No"}</Fact>
            </dl>
            <div className="border-t border-border pt-4">
              <PlanActions id={l.id} plan={l.plan} boosted={boosted} />
            </div>
          </Section>

          <Section
            title="Pagos"
            icon={Banknote}
            aside={
              l.plan !== "founder" && (
                <Link to={`/pagos?local=${l.id}`}>
                  <Button variant="secondary">Registrar pago</Button>
                </Link>
              )
            }
          >
            {payments.length === 0 ? (
              <p className="text-sm text-text-soft">Sin pagos registrados.</p>
            ) : (
              <div className="divide-y divide-border">
                {payments.map((p) => (
                  <PaymentRow key={p.id} p={p} />
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          <StatusCard id={l.id} status={l.status} reason={l.status_reason} name={l.name} />

          <Section title="Datos del local">
            <dl className="grid grid-cols-2 gap-4">
              <Fact label="Dueño">{l.owner_name}</Fact>
              <Fact label="Alta">{fmtDate(l.created_at)}</Fact>
              <Fact label="WhatsApp">{contact.whatsapp ?? "—"}</Fact>
              <Fact label="Teléfono">{contact.phone ?? "—"}</Fact>
              <Fact label="Instagram">{contact.instagram ? `@${contact.instagram}` : "—"}</Fact>
              <Fact label="RIF">{contact.rif ?? "—"}</Fact>
              <Fact label={l.ghost_kitchen ? "Zona" : "Dirección"}>{(l.ghost_kitchen ? l.zone_label : l.address) ?? "—"}</Fact>
              <Fact label="Categorías">{l.categories.length ? l.categories.join(", ") : "—"}</Fact>
            </dl>
            {l.description && <p className="border-t border-border pt-3 text-sm text-text-soft">{l.description}</p>}
          </Section>

          <Section title="Historial" icon={History}>
            {timeline.length === 0 ? (
              <p className="text-sm text-text-soft">Aún no hay movimientos.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {timeline.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.kind === "payment" ? "bg-good" : e.kind === "plan" ? "bg-brand" : "bg-danger"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">{e.title}</p>
                      {e.detail && <p className="break-words text-sm text-text-soft">{e.detail}</p>}
                      <p className="text-xs text-text-soft">
                        {timeAgo(e.at)} · {fmtDate(e.at)}
                        {e.by && ` · ${e.by}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
