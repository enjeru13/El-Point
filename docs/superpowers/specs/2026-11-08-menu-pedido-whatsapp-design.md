# Menú con tasas visibles y pedido armado por WhatsApp

Fecha: 2026-11-08
Estado: aprobado 2026-11-08
Maqueta: https://claude.ai/artifact/QD5JhbMTsqRJDm7vGnrf92 (opción B elegida)

## Por qué

Hoy el comensal ve el menú de un local con precios y tasas, pero:

- Las tasas aparecen como una nota pequeña al pie del menú ("BCV 1.000 Bs/USD").
  En palabras del dueño de El Point: "Son muy pequeñas y puede ser complicado para el comensal verlas".
- Para pedir, el botón "Pedir por WhatsApp" abre un chat con un saludo genérico.
  El comensal tiene que escribir a mano qué quiere, cuánto y a dónde.

La meta es que el comensal arme el pedido tocando los platos del menú y lo envíe
listo por WhatsApp al número del local, con total, tipo de entrega y ubicación.
Es la pieza que le falta a la app para que locales y comensales "lo tengan todo".

## Metas

1. La tasa que usa el local se ve grande, arriba del menú, y dice de cuándo es.
2. El comensal elige en qué moneda ver los precios ($ | Bs | COP).
3. El comensal suma platos con "+ Agregar" y ajusta la cantidad con "− n +".
4. Una barra flotante abajo ("Ver pedido · N productos · total") abre una hoja inferior con el resumen.
5. En la hoja elige entre "Paso a buscarlo" y "Delivery", y para delivery marca la ubicación en un mapa.
6. Un botón "Enviar pedido por WhatsApp" abre WhatsApp con el mensaje ya armado.
7. El dueño configura el precio del delivery: fijo, o "según la zona".

## No metas

- No hay pedidos dentro de la app: ni estados, ni historial, ni confirmación, ni pagos.
  El pedido vive en WhatsApp.
- No se cobra nada en la app ni se muestran precios de planes (regla Apple 3.1.1).
- No hay zonas de delivery con precios por zona dibujadas en mapa.
- No se calcula el costo del delivery por distancia.
- No hay modificadores de platos (extras, tamaños). La nota libre cubre eso.

## Anti-metas (sería un fracaso aunque funcione)

- Que el menú de un local que no acepta pedidos se vea distinto o peor que hoy.
- Que el comensal mande un total equivocado porque la tasa estaba vieja y nada se lo advirtió.
- Que el carrito tape el menú o los botones de contacto.
- Que la ubicación del comensal se suba a nuestros servidores.

## Lo que ya existe y se reutiliza

- `restaurants.accepts_orders` (interruptor "Pedidos" del dueño) y `restaurants.order_greeting`
  (saludo propio, máximo 200 caracteres). Migración `20260922020000_order_button.sql`.
- Hoy el botón "Pedir" aparece si `whatsapp && !ghost_kitchen && has_plan && accepts_orders`
  (`app/restaurant/[id].tsx`, `canOrder`).
- `lib/contact.ts`: `whatsappUrl(raw, text)` y `orderMessage(name, greeting)`.
- Evento `'order'` en `restaurant_events` (ya cuenta los pedidos iniciados en las estadísticas del dueño).
- Moneda base y tasas del menú (migración `20260926000000_menu_currency_rates.sql`):
  - `menu_base_currency` es `usd | bs | cop`: la moneda en que el dueño escribe sus precios.
  - `menu_currencies` lista las monedas que se muestran.
  - `menu_bs_rate` y `menu_cop_rate` son la tasa propia del local; null significa automática:
    BCV para Bs, la del día para COP.
- `lib/queries/exchangeRate.ts`: `useEffectiveRates`, `convertAmount`, `formatMoney`, `priceLines`.
- `components/restaurant/MenuSection.tsx`: el menú agrupado por secciones plegables.
- Selector de ubicación con pin centrado sobre `react-native-maps`, en `app/(auth)/register-owner.tsx`.
- Comodidades `delivery` (id 12) y `takeaway` (id 13, "Para llevar").

## Diseño

### 1. Tarjeta de tasa

Va arriba del menú, debajo del título "Menú". Solo aparece si el menú muestra más de una moneda
(`menu_currencies.length > 1`).

- Línea principal, grande: "1 $ = Bs 1.000 · COP 3.200". Solo incluye las monedas que el local muestra.
- Línea secundaria, pequeña, por cada tasa:
  - Automática: "Tasa BCV de hoy" para Bs, "Tasa del día" para COP. Nunca lleva aviso.
  - Propia del local: "Tasa del local · actualizada hoy / ayer / hace N días".
- Aviso: si alguna tasa propia tiene más de 7 días, la línea secundaria pasa a color de aviso
  y dice "Tasa de hace N días, confirma con el local".
- La tarjeta reemplaza la nota pequeña que hoy está al pie de `MenuSection`.

Dato nuevo: hay que saber cuándo cambió cada tasa propia. Se agregan
`restaurants.menu_bs_rate_updated_at` y `restaurants.menu_cop_rate_updated_at` (timestamptz, null).
Un trigger BEFORE UPDATE los pone en `now()` cuando cambia el valor de su tasa, y en null cuando la tasa
vuelve a null. Ambas columnas necesitan `grant select (...) to anon, authenticated`.
Para las tasas propias que ya existen, el valor inicial es `updated_at` del local (aproximación).

### 2. Selector de moneda

- Control segmentado `$ | Bs | COP` bajo la tarjeta de tasa. Solo muestra las monedas de `menu_currencies`.
  Con una sola moneda no hay selector.
- Arranca en `$` (decisión del dueño de El Point). Si el local no muestra `$`, arranca en su moneda base.
- La app recuerda la última moneda elegida en el teléfono (un valor para todos los locales).
  Si la recordada no está en ese local, se usa la regla anterior.
- En cada plato, el precio en la moneda elegida va grande. Si no es la moneda base del local,
  el precio base va al lado en pequeño.
  Ejemplo con Bs elegido y base en $: "Bs 5.000,00" grande y "$5,00" pequeño.
- Si falta una tasa automática porque no se pudo cargar, esa moneda
  no aparece en el selector, ni en la tarjeta, ni en las equivalencias. Si era la moneda
  recordada, se usa la regla de arranque. El total nunca se calcula con una tasa ausente.
- El precio en la moneda base es exacto. Los convertidos llevan "≈" en la hoja del pedido
  y en el mensaje de WhatsApp. En el menú, la tarjeta de tasa ya explica que son aproximados.

### 3. Platos y carrito

Disposición de cada plato (maqueta versión 2):

- Nombre, y debajo la descripción, a todo el ancho.
- Debajo, una fila: precio a la izquierda, y "+ Agregar" a la derecha.
- Después de agregar, el botón cambia a un contador `− n +`. Al bajar a 0 vuelve a "+ Agregar".

Cuándo hay carrito (`canOrder`):

- Local normal: `whatsapp && has_plan && accepts_orders`. Igual que hoy.
- Cocina fantasma: `whatsapp && has_plan`, sin interruptor (para ellas los pedidos están
  siempre activos, como ya dice el panel). Sin plan no hay carrito: el dueño de El Point
  decidió no abrirles el menú gratis.
- Sin `canOrder`, el menú se ve exactamente como hoy, sin botones.

Estado del carrito:

- Va en memoria, uno por local, mientras la app está abierta. Si sales del local y vuelves,
  el carrito sigue ahí. Si cierras la app, se pierde.
- Si un plato desaparece o cambia de precio, al abrir la hoja se usan los datos actuales del menú.
  Los platos que ya no existen se quitan sin aviso.
- El plato del día cuenta como un plato más.
- Los platos agotados (`available = false`, el dueño los marca con el interruptor "Disponible"
  del editor de menú) y el plato del día vencido no muestran "+ Agregar". Si se agotan con el carrito armado, se quitan al abrir la hoja.
- (Decisión del diseñador) Un local con `canOrder` pero sin platos en el menú no tiene carrito.
  Su fila de WhatsApp sigue igual que hoy.

Fila de WhatsApp en "Contacto" (decisión del diseñador): se queda como hoy. Con `canOrder`
abre el chat con el saludo del local, sin lista, para quien prefiera escribir a mano.

Barra flotante:

- Aparece fija abajo cuando el carrito tiene al menos un producto:
  "Ver pedido · 3 productos" a la izquierda y el total en la moneda elegida a la derecha.
- No debe tapar contenido: la pantalla agrega un espacio al final igual al alto de la barra.
- Tocarla abre la hoja del pedido.

### 4. Hoja del pedido

Hoja inferior con:

1. Título "Tu pedido · {local}".
2. Una línea por plato: "2 × Hamburguesa mixta" y el subtotal. Cada línea se puede cambiar con `− n +`.
3. Tipo de entrega, según las comodidades del local:
   - Con Delivery y Para llevar: dos opciones, "Paso a buscarlo" y "Delivery". No hay ninguna marcada al inicio.
   - Con una sola de las dos: no se pregunta, y se muestra como texto ("Entrega: Delivery").
   - Sin ninguna: no se pregunta, y el mensaje no menciona la entrega.
4. Si es Delivery:
   - Botón "Elegir ubicación de entrega", que abre el selector de mapa (sección 5).
     Una vez elegido, se muestra un mapa pequeño con el punto y "Cambiar".
   - Campo "Referencias" (opcional), por ejemplo "casa azul, al lado de la panadería, piso 2".
   - Línea de costo:
     - Precio fijo: "Delivery $1,50", que se suma al total.
     - Según zona: "+ delivery según tu zona, el local te confirma", que no se suma.
5. Campo "Nota para el local (opcional)".
6. Total en la moneda elegida, y debajo las equivalencias ("≈ Bs 13.000 · COP 41.600").
7. Botón verde "Enviar pedido por WhatsApp":
   - Desactivado si hay que elegir tipo de entrega y no se eligió.
   - Desactivado si es Delivery y no hay ubicación.
   - Al tocarlo registra el evento `'order'`, abre `whatsappUrl(whatsapp, mensaje)` y cierra la hoja.
     El carrito no se vacía, por si el comensal vuelve sin haber enviado.
   - Junto al botón hay "Vaciar pedido".

### 5. Selector de ubicación de entrega

- Pantalla completa con el mapa y un pin fijo en el centro. El comensal mueve el mapa y toca "Confirmar".
- Dónde arranca, en orden:
  1. El último punto que el comensal confirmó en este teléfono.
  2. Su ubicación actual, si dio permiso.
  3. El centro de San Cristóbal.
- Se extrae del selector de `register-owner.tsx` a un componente compartido, en lugar de duplicarlo.
- El último punto y las referencias se guardan solo en el teléfono (almacenamiento local).
  Nunca se suben a Supabase.

### 6. Mensaje de WhatsApp

Formato (se omiten las líneas que no aplican):

```
{saludo del local, o "Hola, quiero hacer un pedido en {local}."}

2 × Hamburguesa mixta — $10,00
1 × Polar — $1,50

Delivery: $1,50            (o "Delivery: según la zona")
Total: $13,00 (≈ Bs 13.000 · COP 41.600)

Entrega: Delivery          (o "Paso a buscarlo")
Ubicación: https://maps.google.com/?q=7.77120,-72.22010
Referencias: casa azul, piso 2
Nota: sin cebolla

Pedido desde El Point
```

- Los montos van en la moneda base del local, porque es el precio exacto que escribió el dueño.
  Las equivalencias van entre paréntesis con "≈" y solo incluyen las monedas que muestra el local.
- Las coordenadas van con 5 decimales.
- `orderMessage` se amplía o se reemplaza con una función pura que arma este texto
  a partir del carrito y las opciones.

### 7. Panel del dueño

En la sección "Pedidos" (`components/owner/sections.tsx`, la misma del interruptor y el saludo):

- Si el local marcó la comodidad Delivery, aparece "Costo del delivery" con dos opciones:
  - "Precio fijo", con un campo de monto en la moneda base del local.
  - "Según la zona".
- Si el local no marcó Delivery, esta parte no aparece.
- El texto de ayuda explica que el comensal arma su pedido desde el menú.
- Se actualiza el resumen de la fila en `app/(owner)/local.tsx`.

Datos nuevos en `restaurants`:

- `delivery_fee_mode text null`, con check `in ('fixed','zone')`. Null equivale a "según la zona".
- `delivery_fee numeric(12,2) null`, con check `> 0`. Solo cuenta si el modo es `fixed`, y está en la moneda base.
- Ambas columnas necesitan `grant select (...) to anon, authenticated` y deben quedar en la lista de
  columnas que el dueño puede actualizar.

## Restricciones

- Expo SDK 54. Antes de escribir código hay que leer la documentación de la v54 (`AGENTS.md`).
- NativeWind: nunca usar `style={({pressed}) => [array]}` en `Pressable`.
- Textos en español neutro de Venezuela, con "tú".
- Las columnas nuevas de `restaurants` necesitan grants de columna.
  `latitude`/`longitude` son columnas generadas.
- Cada migración lleva su prueba en `supabase/tests/`, que se corre con `scripts/sqltest.mjs`.
- No se publica una EAS Update a producción sin que el dueño de El Point lo pida.

## Lo que decide quien lo construya

- Componentes y estructura de archivos del carrito: contexto, store o estado en la pantalla.
- La librería de la hoja inferior. Se prefiere lo que ya use la app.
- Cómo se ven exactamente la tarjeta de tasa y el selector, dentro del tema actual de la app.
- Las animaciones de la barra y la hoja.
