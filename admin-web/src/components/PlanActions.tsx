import { useState } from "react";
import { useAdjustPlan } from "../lib/queries/subscriptions";
import type { PlanState } from "../lib/queries/locales";
import { Button, INPUT, INPUT_AUTO } from "./ui";

type Panel = null | "days" | "date" | "remove" | "boost";

/**
 * Acciones sobre el plan de un local: sumar días, fijar vencimiento, quitar el
 * plan o el Destacado. Cada una pide confirmación y un motivo opcional que
 * queda en el historial. No se muestra para Originales (su plan no vence).
 */
export function PlanActions({ id, plan, boosted }: { id: string; plan: PlanState; boosted: boolean }) {
  const adjust = useAdjustPlan();
  const [panel, setPanel] = useState<Panel>(null);
  const [days, setDays] = useState("30");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  if (plan === "founder") {
    return <p className="text-sm text-text-soft">Los locales Originales no pagan plan, así que no hay nada que ajustar.</p>;
  }

  function close() {
    setPanel(null);
    setReason("");
    adjust.reset();
  }
  function run(input: Parameters<typeof adjust.mutate>[0]) {
    adjust.mutate(input, { onSuccess: close });
  }
  const r = reason.trim() || undefined;

  const reasonField = (
    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional, queda en el historial)" className={INPUT} />
  );
  const footer = (confirm: React.ReactNode) => (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={close}>
        Cancelar
      </Button>
      {confirm}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setPanel("days")}>
          Sumar días
        </Button>
        <Button variant="secondary" onClick={() => setPanel("date")}>
          Fijar vencimiento
        </Button>
        {boosted && (
          <Button variant="secondary" onClick={() => setPanel("boost")}>
            Quitar Destacado
          </Button>
        )}
        {(plan === "active" || plan === "expiring") && (
          <Button variant="danger" onClick={() => setPanel("remove")}>
            Quitar plan
          </Button>
        )}
      </div>

      {panel && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-3">
          {panel === "days" && (
            <>
              <label className="flex flex-col gap-1 text-xs font-semibold text-text-soft">
                Días de cortesía (se suman al vencimiento, o desde hoy si ya venció)
                <input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={`${INPUT_AUTO} w-32`} />
              </label>
              {reasonField}
              {footer(
                <Button loading={adjust.isPending} disabled={!Number(days)} onClick={() => run({ restaurantId: id, action: "add_days", days: Number(days), reason: r })}>
                  Sumar {Number(days) || 0} días
                </Button>,
              )}
            </>
          )}
          {panel === "date" && (
            <>
              <label className="flex flex-col gap-1 text-xs font-semibold text-text-soft">
                Nuevo vencimiento
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${INPUT_AUTO} w-48`} />
              </label>
              {reasonField}
              {footer(
                <Button
                  loading={adjust.isPending}
                  disabled={!date}
                  onClick={() => run({ restaurantId: id, action: "set_date", date: new Date(`${date}T23:59:59-04:00`).toISOString(), reason: r })}
                >
                  Fijar fecha
                </Button>,
              )}
            </>
          )}
          {panel === "remove" && (
            <>
              <p className="text-sm text-text-soft">
                El local pasa a perfil básico ahora mismo: sigue en el mapa pero sin contacto, menú ni fotos. Los pagos registrados no se tocan.
              </p>
              {reasonField}
              {footer(
                <Button variant="danger" loading={adjust.isPending} onClick={() => run({ restaurantId: id, action: "remove", reason: r })}>
                  Quitar plan
                </Button>,
              )}
            </>
          )}
          {panel === "boost" && (
            <>
              <p className="text-sm text-text-soft">Se quita el Destacado ahora mismo. El plan no cambia.</p>
              {reasonField}
              {footer(
                <Button variant="danger" loading={adjust.isPending} onClick={() => run({ restaurantId: id, action: "remove_boost", reason: r })}>
                  Quitar Destacado
                </Button>,
              )}
            </>
          )}
          {adjust.isError && (
            <p className="text-sm text-danger" role="alert">
              {(adjust.error as Error).message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
