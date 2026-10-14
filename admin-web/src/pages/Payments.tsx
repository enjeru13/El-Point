import { useState } from "react";
import { Banknote, Bitcoin, Landmark, Smartphone } from "lucide-react";
import {
  METHOD_LABEL,
  PLAN_EFFECT,
  PLAN_LABEL,
  usePayingRestaurants,
  usePendingPayments,
  useRecentPayments,
  useRegisterPayment,
  useResolvePayment,
  useVoidPayment,
  type PaymentMethod,
  type PaymentPlan,
  type PendingPayment,
  type RecentPayment,
} from "../lib/queries/payments";
import { Badge, Button, Card, EmptyState, PageHeader, PageLoading, StripeCard, timeAgo } from "../components/ui";

const METHOD_ICON = {
  bs_bcv: Banknote,
  binance: Bitcoin,
  bancolombia: Landmark,
  nequi: Smartphone,
  davivienda: Landmark,
} as const;

const FIELD =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand";

function RegisterPayment() {
  const restaurantsQ = usePayingRestaurants();
  const register = useRegisterPayment();
  const [restaurantId, setRestaurantId] = useState("");
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
            <Badge tone={voided ? "danger" : "good"}>{voided ? "Anulado" : "Aprobado"}</Badge>
          </div>
          <p className="truncate text-sm text-text-soft">
            {METHOD_LABEL[p.method]} · Ref. {p.reference}
            {p.amount != null && ` · ${p.amount} USD`} · {new Date(p.submitted_at).toLocaleDateString("es-VE", { day: "numeric", month: "short" })}
          </p>
          {voided && p.note && <p className="truncate text-xs text-text-soft">{p.note}</p>}
        </div>
        {!voided && !voiding && (
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
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
          />
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

function History() {
  const q = useRecentPayments();
  if (q.isLoading) return <PageLoading />;
  if ((q.data ?? []).length === 0) {
    return <EmptyState icon={Banknote} title="Sin pagos registrados" body="Cuando registres o apruebes uno, aparece aquí." />;
  }
  return (
    <Card className="divide-y divide-border overflow-hidden">
      {q.data!.map((p) => (
        <HistoryRow key={p.id} p={p} />
      ))}
    </Card>
  );
}

type Tab = "pending" | "register" | "history";

export function Payments() {
  const q = usePendingPayments();
  const pendingCount = q.data?.length ?? 0;
  const [tab, setTab] = useState<Tab>("register");

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "register", label: "Registrar pago" },
    { key: "pending", label: "Por verificar", badge: pendingCount },
    { key: "history", label: "Historial" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Negocio"
        title="Pagos"
        body="Registra los pagos que llegan por WhatsApp, verifica comprobantes y anula los que se registraron por error."
      />

      <div className="inline-flex w-fit max-w-full overflow-x-auto rounded-full border border-border bg-surface-2 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold transition ${
              tab === t.key ? "bg-brand text-white shadow-sm" : "text-text-soft hover:text-text"
            }`}
          >
            {t.label}
            {!!t.badge && (
              <span className={`rounded-full px-1.5 text-[11px] leading-5 ${tab === t.key ? "bg-white/25" : "bg-brand text-white"}`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "register" && <RegisterPayment />}

      {tab === "pending" &&
        (q.isLoading ? (
          <PageLoading />
        ) : pendingCount === 0 ? (
          <EmptyState icon={Banknote} title="Sin pagos pendientes" body="Nada esperando verificación ahora mismo." />
        ) : (
          <div className="flex flex-col gap-4">
            {q.data!.map((p) => (
              <Row key={p.id} p={p} />
            ))}
          </div>
        ))}

      {tab === "history" && <History />}
    </div>
  );
}
