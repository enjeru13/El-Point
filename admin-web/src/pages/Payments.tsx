import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Banknote, Bitcoin, Clock, Download, Landmark, MessageCircle, Receipt, Search, Smartphone, Wallet } from "lucide-react";
import {
  METHOD_LABEL,
  PLAN_EFFECT,
  PLAN_LABEL,
  usePayingRestaurants,
  usePendingPayments,
  usePrivateContacts,
  useRecentPayments,
  useRegisterPayment,
  useResolvePayment,
  useVoidPayment,
  type PaymentMethod,
  type PaymentPlan,
  type PendingPayment,
  type RecentPayment,
} from "../lib/queries/payments";
import { daysUntil, useAllLocales, type LocalRow } from "../lib/queries/locales";
import { fmtDate, fmtMoney, waLink } from "../lib/format";
import { Badge, Button, Card, EmptyState, PageHeader, PageLoading, StatTile, StripeCard, Tabs, timeAgo } from "../components/ui";

const METHOD_ICON = {
  bs_bcv: Banknote,
  binance: Bitcoin,
  bancolombia: Landmark,
  nequi: Smartphone,
  davivienda: Landmark,
} as const;

const FIELD =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand";
const FIELD_AUTO = FIELD.replace("w-full ", "");

function RegisterPayment({ initialLocal = "" }: { initialLocal?: string }) {
  const restaurantsQ = usePayingRestaurants();
  const register = useRegisterPayment();
  const [restaurantId, setRestaurantId] = useState(initialLocal);
  const [plan, setPlan] = useState<PaymentPlan>("monthly");
  const [method, setMethod] = useState<PaymentMethod>("bs_bcv");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const canSubmit = !!restaurantId && reference.trim().length > 0 && !register.isPending;

  function submit() {
    setDone(null);
    register.mutate(
      {
        restaurantId,
        plan,
        method,
        reference: reference.trim(),
        amount: amount ? Number(amount) : undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (paidUntil) => {
          const name = restaurantsQ.data?.find((r) => r.id === restaurantId)?.name ?? "El local";
          setDone(
            `${name}: plan activo hasta el ${new Date(paidUntil).toLocaleDateString("es-VE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}.`,
          );
          setReference("");
          setAmount("");
          setNote("");
        },
      },
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="font-display text-lg font-bold text-text">Registrar un pago</h2>
        <p className="text-sm text-text-soft">
          Para pagos que llegan por WhatsApp. Confirma la referencia en el banco o en Binance antes de registrarlo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-text-soft sm:col-span-2" htmlFor="pay-local">
          Local
          <select id="pay-local" className={FIELD} value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
            <option value="">{restaurantsQ.isLoading ? "Cargando…" : "Elige un local"}</option>
            {(restaurantsQ.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.paid_until ? ` · vence ${new Date(r.paid_until).toLocaleDateString("es-VE")}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-text-soft" htmlFor="pay-plan">
          Plan
          <select id="pay-plan" className={FIELD} value={plan} onChange={(e) => setPlan(e.target.value as PaymentPlan)}>
            {(Object.keys(PLAN_LABEL) as PaymentPlan[]).map((k) => (
              <option key={k} value={k}>
                {PLAN_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-text-soft" htmlFor="pay-method">
          Método
          <select id="pay-method" className={FIELD} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((k) => (
              <option key={k} value={k}>
                {METHOD_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-text-soft" htmlFor="pay-ref">
          Referencia
          <input id="pay-ref" className={FIELD} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N.º de referencia o de orden" />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-text-soft" htmlFor="pay-amount">
          Monto recibido (opcional)
          <input id="pay-amount" className={FIELD} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Equivalente en USD" />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-text-soft sm:col-span-2" htmlFor="pay-note">
          Nota (opcional)
          <input id="pay-note" className={FIELD} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tasa usada, observaciones…" />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-soft">{PLAN_EFFECT[plan]}</p>
        <Button loading={register.isPending} disabled={!canSubmit} onClick={submit}>
          Registrar y activar
        </Button>
      </div>

      {register.isError && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {(register.error as Error).message}
        </p>
      )}
      {done && (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm font-semibold text-text" role="status">
          {done}
        </p>
      )}
    </Card>
  );
}

function Row({ p }: { p: PendingPayment }) {
  const resolve = useResolvePayment();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const Icon = METHOD_ICON[p.method];

  return (
    <StripeCard tone="brand" className="flex flex-col gap-4 py-5 pr-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
          {p.proof_url ? (
            <a href={p.proof_url} target="_blank" rel="noreferrer">
              <img src={p.proof_url} alt="Comprobante" className="h-14 w-14 object-cover" />
            </a>
          ) : (
            <Icon className="h-6 w-6 text-text-soft" strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-bold text-text">{p.restaurant_name}</p>
            <Badge>{p.owner_name}</Badge>
            <Badge tone="brand">{METHOD_LABEL[p.method]}</Badge>
            {p.plan && <Badge>{PLAN_LABEL[p.plan]}</Badge>}
          </div>
          <p className="mt-1 text-sm text-text-soft">
            Ref. {p.reference}
            {p.amount != null && ` · ${p.amount} USD`}
          </p>
          <p className="mt-0.5 text-xs text-text-soft">{timeAgo(p.submitted_at)}</p>
        </div>
      </div>

      {rejecting ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3">
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo del rechazo (se lo mostramos al dueño)…"
            className="min-h-16 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejecting(false)}>Cancelar</Button>
            <Button
              variant="danger"
              loading={resolve.isPending}
              onClick={() =>
                resolve.mutate(
                  { paymentId: p.id, action: "reject", note: note.trim() || undefined },
                  { onSuccess: () => setRejecting(false) },
                )
              }
            >
              Confirmar rechazo
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejecting(true)} disabled={resolve.isPending}>
            Rechazar
          </Button>
          <Button loading={resolve.isPending} onClick={() => resolve.mutate({ paymentId: p.id, action: "approve" })}>
            Aprobar · {PLAN_EFFECT[p.plan ?? "annual"].split(" · ")[0]}
          </Button>
        </div>
      )}
    </StripeCard>
  );
}

function HistoryRow({ p }: { p: RecentPayment }) {
  const voidMut = useVoidPayment();
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const Icon = METHOD_ICON[p.method];
  const voided = p.status === "voided";
  const tone = p.status === "approved" ? "good" : p.status === "rejected" ? "neutral" : "danger";
  const label = { approved: "Aprobado", voided: "Anulado", rejected: "Rechazado" }[p.status];

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-soft">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-display text-base font-bold ${voided ? "text-text-soft line-through" : "text-text"}`}>{p.restaurant_name}</p>
            {p.plan && <Badge>{PLAN_LABEL[p.plan].split(" · ")[0]}</Badge>}
            <Badge tone={tone}>{label}</Badge>
          </div>
          <p className="truncate text-sm text-text-soft">
            {METHOD_LABEL[p.method]} · Ref. {p.reference}
            {p.amount != null && ` · ${fmtMoney(p.amount)}`} · {fmtDate(p.submitted_at)}
          </p>
          {(voided || p.status === "rejected") && p.note && <p className="truncate text-xs text-text-soft">{p.note}</p>}
        </div>
        {p.status === "approved" && !voiding && (
          <Button variant="ghost" onClick={() => setVoiding(true)}>
            Anular
          </Button>
        )}
      </div>

      {voiding && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3">
          <p className="text-sm text-text-soft">
            Se le resta al local lo que este pago sumó ({PLAN_EFFECT[p.plan ?? "annual"]}). El pago queda en el historial como anulado.
          </p>
          <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" className={FIELD} />
          {voidMut.isError && (
            <p className="text-sm text-danger" role="alert">
              {(voidMut.error as Error).message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setVoiding(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={voidMut.isPending}
              onClick={() => voidMut.mutate({ paymentId: p.id, reason: reason.trim() || undefined }, { onSuccess: () => setVoiding(false) })}
            >
              Anular pago
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function downloadCsv(rows: RecentPayment[]) {
  const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Fecha", "Local", "Plan", "Método", "Referencia", "Monto USD", "Estado", "Nota"];
  const body = rows.map((p) =>
    [fmtDate(p.submitted_at), p.restaurant_name, p.plan ?? "", METHOD_LABEL[p.method], p.reference, p.amount ?? "", p.status, p.note ?? ""].map(esc).join(","),
  );
  const blob = new Blob(["\ufeff" + [head.map(esc).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pagos-el-point-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function History() {
  const q = useRecentPayments();
  const [term, setTerm] = useState("");
  const [method, setMethod] = useState<"all" | PaymentMethod>("all");
  const [status, setStatus] = useState<"all" | RecentPayment["status"]>("all");

  const all = q.data ?? [];
  const rows = all.filter((p) => {
    if (method !== "all" && p.method !== method) return false;
    if (status !== "all" && p.status !== status) return false;
    const t = term.trim().toLowerCase();
    return !t || p.restaurant_name.toLowerCase().includes(t) || p.reference.toLowerCase().includes(t);
  });
  const total = rows.filter((p) => p.status === "approved").reduce((s, p) => s + (p.amount ?? 0), 0);

  if (q.isLoading) return <PageLoading />;
  if (all.length === 0) return <EmptyState icon={Banknote} title="Sin pagos registrados" body="Cuando registres o apruebes uno, aparece aquí." />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" strokeWidth={2} />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar por local o referencia" className={`${FIELD} pl-9`} aria-label="Buscar pagos" />
        </div>
        <select className={FIELD_AUTO} value={method} onChange={(e) => setMethod(e.target.value as typeof method)} aria-label="Filtrar por método">
          <option value="all">Todos los métodos</option>
          {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((k) => (
            <option key={k} value={k}>
              {METHOD_LABEL[k]}
            </option>
          ))}
        </select>
        <select className={FIELD_AUTO} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filtrar por estado">
          <option value="all">Todos los estados</option>
          <option value="approved">Aprobados</option>
          <option value="voided">Anulados</option>
          <option value="rejected">Rechazados</option>
        </select>
        <Button variant="secondary" onClick={() => downloadCsv(rows)} disabled={rows.length === 0}>
          <Download className="h-4 w-4" strokeWidth={2} /> Exportar CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Banknote} title="Ningún pago coincide" body="Prueba con otra búsqueda o quita algún filtro." />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {rows.map((p) => (
              <HistoryRow key={p.id} p={p} />
            ))}
          </div>
          <p className="border-t border-border px-5 py-2.5 text-xs text-text-soft">
            {rows.length} {rows.length === 1 ? "pago" : "pagos"} · {fmtMoney(total)} aprobados
          </p>
        </Card>
      )}
    </div>
  );
}

function reminderText(l: LocalRow): string {
  const d = daysUntil(l.paid_until) ?? 0;
  const when = d >= 0 ? `vence el ${fmtDate(l.paid_until)}` : `venció el ${fmtDate(l.paid_until)}`;
  return (
    `Hola, te escribimos de El Point. El plan de ${l.name} ${when}. ` +
    `Al renovarlo mantienes tu perfil completo (contacto, menú, fotos, promos y respuestas). ` +
    `Hay plan mensual (US$3), trimestral (US$7) y anual (US$18). ¿Te paso los datos de pago?`
  );
}

function Renewals({ onRegister }: { onRegister: (id: string) => void }) {
  const q = useAllLocales();
  const list = (q.data ?? [])
    .filter((l) => l.status === "approved" && (l.plan === "expiring" || (l.plan === "expired" && (daysUntil(l.paid_until) ?? -999) >= -30)))
    .sort((a, b) => (a.paid_until ?? "").localeCompare(b.paid_until ?? ""));
  const contactsQ = usePrivateContacts(list.map((l) => l.id));

  if (q.isLoading) return <PageLoading />;
  if (list.length === 0) {
    return <EmptyState icon={Clock} title="Nada por renovar" body="Ningún plan vence en los próximos 7 días ni venció en el último mes." />;
  }

  return (
    <Card className="overflow-hidden">
      <p className="border-b border-border bg-surface-2 px-5 py-2.5 text-xs text-text-soft">
        Planes que vencen en 7 días o menos, o que vencieron en los últimos 30. El botón de WhatsApp abre el chat con el recordatorio ya escrito.
      </p>
      <div className="divide-y divide-border">
        {list.map((l) => {
          const d = daysUntil(l.paid_until) ?? 0;
          const wa = waLink(contactsQ.data?.get(l.id)?.whatsapp, reminderText(l));
          return (
            <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/locales/${l.id}`} className="font-display text-base font-bold text-text hover:underline">
                    {l.name}
                  </Link>
                  <Badge tone={d >= 0 ? "warn" : "danger"}>{d >= 0 ? `Vence en ${d} d` : `Venció hace ${Math.abs(d)} d`}</Badge>
                </div>
                <p className="text-sm text-text-soft">
                  {l.owner_name} · {fmtDate(l.paid_until)}
                </p>
              </div>
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer">
                  <Button variant="secondary">
                    <MessageCircle className="h-4 w-4" strokeWidth={2} /> Recordar
                  </Button>
                </a>
              ) : (
                <span className="text-xs text-text-soft">{contactsQ.isLoading ? "Cargando…" : "Sin WhatsApp"}</span>
              )}
              <Button onClick={() => onRegister(l.id)}>Registrar pago</Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

type Tab = "register" | "pending" | "renewals" | "history";

export function Payments() {
  const [params, setParams] = useSearchParams();
  const pendingQ = usePendingPayments();
  const paymentsQ = useRecentPayments();
  const localesQ = useAllLocales();
  const pendingCount = pendingQ.data?.length ?? 0;
  const initialLocal = params.get("local") ?? "";
  const tab = (params.get("tab") ?? "register") as Tab;
  const setTab = (t: Tab) => setParams(t === "register" ? {} : { tab: t }, { replace: true });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const thisMonth = (paymentsQ.data ?? []).filter((p) => p.status === "approved" && p.submitted_at >= monthStart);
  const collected = thisMonth.reduce((s, p) => s + (p.amount ?? 0), 0);
  const noAmount = thisMonth.filter((p) => p.amount == null).length;
  const approved = (localesQ.data ?? []).filter((l) => l.status === "approved");
  const expiring = approved.filter((l) => l.plan === "expiring").length;
  const renewalsCount = approved.filter((l) => l.plan === "expiring" || (l.plan === "expired" && (daysUntil(l.paid_until) ?? -999) >= -30)).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Negocio"
        title="Pagos"
        body="Registra los pagos que llegan por WhatsApp, recuerda las renovaciones y revisa el historial."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Wallet} label="Cobrado este mes" value={fmtMoney(collected)} hint={noAmount ? `${noAmount} sin monto indicado` : `${thisMonth.length} ${thisMonth.length === 1 ? "pago" : "pagos"}`} tone="good" />
        <StatTile icon={Receipt} label="Pagos este mes" value={thisMonth.length} hint="aprobados" tone="brand" />
        <StatTile icon={Clock} label="Por renovar" value={expiring} hint="vencen en 7 días" tone={expiring ? "danger" : "neutral"} />
        <StatTile icon={Banknote} label="Por verificar" value={pendingCount} hint="comprobantes" tone="neutral" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "register", label: "Registrar pago" },
          { value: "pending", label: "Por verificar", badge: pendingCount },
          { value: "renewals", label: "Renovaciones", badge: renewalsCount },
          { value: "history", label: "Historial" },
        ]}
      />

      {tab === "register" && <RegisterPayment initialLocal={initialLocal} />}

      {tab === "pending" &&
        (pendingQ.isLoading ? (
          <PageLoading />
        ) : pendingCount === 0 ? (
          <EmptyState icon={Banknote} title="Sin pagos pendientes" body="Nada esperando verificación ahora mismo." />
        ) : (
          <div className="flex flex-col gap-4">
            {pendingQ.data!.map((p) => (
              <Row key={p.id} p={p} />
            ))}
          </div>
        ))}

      {tab === "renewals" && <Renewals onRegister={(id) => setParams({ local: id }, { replace: true })} />}

      {tab === "history" && <History />}
    </div>
  );
}
