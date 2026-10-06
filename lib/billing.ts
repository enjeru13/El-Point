/**
 * Cobro dentro de la app (precios, cómo pagar, comprobantes). Apagado por
 * defecto: Apple (3.1.1 / 3.1.3) y Google Play (política de Pagos) exigen su
 * propio sistema de compras para vender funciones o servicios digitales dentro
 * de la app y prohíben llevar al usuario a otro método de pago. Con el
 * interruptor apagado la pantalla de suscripción solo muestra el ESTADO del
 * plan; el cobro se hace fuera de la app y el admin activa el plan desde el
 * panel. Se resuelve al compilar (EXPO_PUBLIC_*): encender solo para builds
 * que no van a ninguna tienda.
 */
export const PAYMENTS_IN_APP = process.env.EXPO_PUBLIC_PAYMENTS_IN_APP === "1";
