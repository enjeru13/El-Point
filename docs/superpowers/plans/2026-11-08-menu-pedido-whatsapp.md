# Menú con tasas visibles y pedido por WhatsApp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the diner a visible rate card, a $ | Bs | COP selector, and a cart in the restaurant menu. The cart sends a ready-made order to the restaurant's WhatsApp. The owner configures the delivery cost.

**Architecture:** The pure logic (money, rates, cart, WhatsApp message) lives in `lib/money.ts` and `lib/order.ts`, tested with `node --test`. A React context keeps one in-memory cart per restaurant. The menu, the floating bar, the bottom sheet (`@gorhom/bottom-sheet`) and the map picker (extracted from the registration flow) consume it. One migration adds the rate timestamps and the delivery cost.

**Tech Stack:** Expo SDK 54, expo-router, React Query, Supabase, react-native-maps, @gorhom/bottom-sheet 5, AsyncStorage, node:test.

**Spec:** `docs/superpowers/specs/2026-11-08-menu-pedido-whatsapp-design.md`

## Global Constraints

- Read the Expo v54 docs before using any Expo API (`AGENTS.md`).
- NativeWind: never `style={({pressed}) => [array]}` on `Pressable`.
- Copy in neutral Venezuelan Spanish, using "tú". Use the spec's copy verbatim.
- New `restaurants` columns need `grant select (...) to anon, authenticated`. `latitude`/`longitude` are generated columns.
- Migrations come with SQL tests:
  1. `node scripts/sqltest.mjs supabase/tests/<t>.sql --from <migration>`
  2. `npx supabase db query --linked --yes -f supabase/tests/.out/run.sql`
  3. Apply with `echo y | npx supabase db push`, then regenerate types: `npx supabase gen types typescript --linked > lib/database.types.ts`.
- Never publish an EAS Update to production. The iOS build is `eas build -p ios --profile production` (version 1.1.0, remote buildNumber).
- The diner's location never leaves the phone. Only AsyncStorage, never Supabase.
- `canOrder` (local normal) = `whatsapp && has_plan && accepts_orders && menu has addable items`. For a ghost kitchen it is `whatsapp && has_plan && menu has addable items`, with no toggle.

## Review Focus

1. Base currency `bs` with `$` selected: prices are converted from Bs, and the message totals go in Bs first. Pinned by the test `mensaje_base_bs`.
2. An automatic rate is missing (`rates.bs = null`): Bs disappears from the selector and from the equivalences, and the total never prints "NaN". Pinned by the tests `selector_oculta_moneda_sin_tasa` and `mensaje_sin_tasa_cop`.
3. A dish is removed or sold out while it sits in the cart: it disappears when the cart is read. Pinned by the test `podar_agotados_y_borrados`.
4. A fixed delivery fee configured in Bs, in a restaurant whose base is Bs, is added to the total in the same currency. Pinned by the test `total_con_delivery_fijo`.
5. Delivery and Para llevar are both marked and nothing is chosen yet: the send button stays disabled. Pinned by the test `puede_enviar_requiere_eleccion`.

---

### Task 1: Migration — rate dates and delivery cost

**Files:**
- Create: `supabase/migrations/20261110000000_menu_orders.sql`
- Test: `supabase/tests/menu_orders.sql`
- Modify: `lib/database.types.ts` (regenerated)

**Interfaces:**
- Produces: columns `restaurants.menu_bs_rate_updated_at timestamptz`, `menu_cop_rate_updated_at timestamptz`, `delivery_fee_mode text` (`'fixed'|'zone'|null`), `delivery_fee numeric(12,2)`.

- [ ] **Step 1: Write the test `supabase/tests/menu_orders.sql`** in the style of `duplicate_locales.sql`, using coordinates 8.50, -71.50. Assertions (`pg_temp.ok`):
  - `rate_fecha_al_cambiar`: an update `menu_bs_rate = 1000` leaves `menu_bs_rate_updated_at` not null and ≥ now() - 1 minute.
  - `rate_fecha_igual_si_no_cambia`: an update of another column (`name`) does not change `menu_bs_rate_updated_at`.
  - `rate_fecha_null_al_quitar`: `menu_bs_rate = null` sets `menu_bs_rate_updated_at` to null. The same check applies to cop.
  - `delivery_check`: `delivery_fee_mode = 'otro'` raises `check_violation`, and `delivery_fee = 0` raises `check_violation`.
  - `anon_lee_columnas`: as `anon`, `select delivery_fee_mode, delivery_fee, menu_bs_rate_updated_at, menu_cop_rate_updated_at from restaurants` does not fail.
- [ ] **Step 2: Run it.** Run: `node scripts/sqltest.mjs supabase/tests/menu_orders.sql --from 20261110000000_menu_orders.sql && npx supabase db query --linked --yes -f supabase/tests/.out/run.sql`. Expected: FAIL (the migration is missing or the column does not exist).
- [ ] **Step 3: Write the migration.**
  - Add the 4 columns with the spec's checks.
  - Backfill: `menu_*_rate_updated_at = updated_at` where the rate is not null.
  - BEFORE UPDATE trigger `stamp_menu_rate_dates`, plus a BEFORE INSERT that stamps when the rate comes in non-null. It uses `is distinct from` on each rate.
  - Grant select on the 4 columns.
  - Comments on each column.
- [ ] **Step 4: Run the test.** Same command. Expected: every `ok` passes and the run rolls back.
- [ ] **Step 5: Apply and regenerate types.** Run `echo y | npx supabase db push`, then `npx supabase gen types typescript --linked > lib/database.types.ts`. Expected: the 4 columns appear in `restaurants.Row`.
- [ ] **Step 6: Commit** `feat(db): fecha de tasas del menú y costo de delivery`.

### Task 2: Pure money module

**Files:**
- Create: `lib/money.ts`, `lib/money.test.ts`
- Modify: `lib/queries/exchangeRate.ts`. Move `Rates`, `Cur`, `convertAmount`, `formatMoney`, `priceLines` into `lib/money.ts` and re-export them from here, so current imports keep working.

**Interfaces:**
- Produces, in `lib/money.ts`:
  - `type Cur = "usd" | "bs" | "cop"`
  - `type Rates = { bs: number | null; cop: number | null }`
  - `convertAmount`, `formatMoney` and `priceLines`, with the same signatures as today.
  - `availableCurrencies(currencies: Cur[], base: Cur, rates: Rates): Cur[]`: the base always, plus each other currency that has a rate, in order usd, bs, cop.
  - `initialCurrency(available: Cur[], base: Cur, remembered: Cur | null): Cur`: the remembered one if available, otherwise `usd` if available, otherwise `base`.
  - `rateAgeDays(updatedAt: string | null, now: Date): number | null`: whole calendar days, America/Caracas.
  - `rateNote(kind: "bs" | "cop", own: boolean, ageDays: number | null): { text: string; stale: boolean }`
    - Automatic: Bs gives "Tasa BCV de hoy" and COP gives "Tasa del día", `stale: false`.
    - Own rate:
      - 0 days: "Tasa del local · actualizada hoy"
      - 1 day: "Tasa del local · actualizada ayer"
      - 2 to 7 days: "Tasa del local · actualizada hace N días"
      - More than 7: "Tasa de hace N días, confirma con el local" with `stale: true`.
      - null: "Tasa del local".

- [ ] **Step 1: Write the tests in `lib/money.test.ts`** (`node:test`, importing `./money.ts`):
  - `selector_oculta_moneda_sin_tasa`: `availableCurrencies(["usd","bs","cop"], "usd", {bs:null, cop:3200})` equals `["usd","cop"]`.
  - `arranque_en_dolares`:
    - `initialCurrency(["usd","bs"], "bs", null)` is `"usd"`.
    - `initialCurrency(["bs","cop"], "bs", "usd")` is `"bs"`.
    - `initialCurrency(["usd","bs"], "usd", "bs")` is `"bs"`.
  - `nota_tasa`:
    - `rateNote("bs", false, null).text` is `"Tasa BCV de hoy"`.
    - `rateNote("cop", true, 9)` is `{text:"Tasa de hace 9 días, confirma con el local", stale:true}`.
    - `rateNote("bs", true, 1).text` is `"Tasa del local · actualizada ayer"`.
    - `rateNote("bs", true, 7).stale` is `false`.
  - `edad_tasa`: `rateAgeDays("2026-11-01T15:00:00Z", new Date("2026-11-08T15:00:00Z"))` is `7`, and `rateAgeDays(null, new Date())` is `null`.
  - `convertir_base_bs`: `convertAmount(5000, "bs", "usd", {bs:1000, cop:null})` is `5`.
- [ ] **Step 2: Run.** Run: `node --test lib/money.test.ts`. Expected: FAIL (the module does not exist).
- [ ] **Step 3: Implement `lib/money.ts`** with no React Native imports, and leave the re-exports in `exchangeRate.ts`.
- [ ] **Step 4: Run.** `node --test lib/money.test.ts` should PASS. `npx tsc --noEmit` should show no new errors.
- [ ] **Step 5: Commit** `refactor(money): módulo puro de monedas y notas de tasa`.

### Task 3: Pure order module

**Files:**
- Create: `lib/order.ts`, `lib/order.test.ts`

**Interfaces:**
- Consumes: `Cur`, `Rates`, `convertAmount`, `formatMoney` from `./money.ts`.
- Produces:
  - `type CartItem = { id: string; qty: number }`. Prices are not stored; they are read from the menu.
  - `type MenuLine = { id: string; name: string; price: number; available: boolean; specialExpired: boolean }`
  - `type Delivery = { mode: "fixed" | "zone"; fee: number | null }`
  - `type Fulfillment = "pickup" | "delivery" | null`
  - `fulfillmentOptions(hasDelivery: boolean, hasTakeaway: boolean): Fulfillment[]`
    - Both: `["pickup","delivery"]`. One: `[that one]`. None: `[]`.
  - `pruneCart(cart: CartItem[], menu: MenuLine[]): CartItem[]`: drops items that are missing, unavailable, have an expired special, or have qty ≤ 0.
  - `cartTotal(cart: CartItem[], menu: MenuLine[], delivery: Delivery | null, fulfillment: Fulfillment): number`
    - Sum in the base currency, plus `delivery.fee` only when the fulfillment is `delivery` and the mode is `fixed`.
  - `canSend(opts: { cartCount: number; options: Fulfillment[]; chosen: Fulfillment; location: {lat:number; lng:number} | null }): boolean`
  - `buildOrderMessage(input: { restaurantName: string; greeting: string | null; base: Cur; shown: Cur[]; rates: Rates; cart: CartItem[]; menu: MenuLine[]; delivery: Delivery | null; fulfillment: Fulfillment; askedFulfillment: boolean; location: {lat:number; lng:number} | null; references: string; note: string }): string`
    - Uses the format from section 6 of the spec.
    - First line: greeting, or `Hola, quiero hacer un pedido en {local}.`
    - Lines: `2 × Name — {formatMoney(subtotal, base, true)}`.
    - Delivery: `Delivery: {fee}` or `Delivery: según la zona`.
    - Total: `Total: {base exact}` plus ` (≈ X · Y)` when there are equivalences.
    - `Entrega: Delivery` or `Entrega: Paso a buscarlo`, only when fulfillment is not null.
    - `Ubicación: https://maps.google.com/?q={lat.toFixed(5)},{lng.toFixed(5)}`.
    - `Referencias:` and `Nota:` only when not empty.
    - Last line: `Pedido desde El Point`. Blocks are separated by a blank line.

- [ ] **Step 1: Write the tests in `lib/order.test.ts`:**
  - `opciones_de_entrega`: (true,true) gives `["pickup","delivery"]`, (true,false) gives `["delivery"]`, and (false,false) gives `[]`.
  - `podar_agotados_y_borrados`: with a menu of a (available), b (available:false), c (specialExpired) and cart a:2, b:1, c:1, x:1, the result is `[{id:"a",qty:2}]`.
  - `total_con_delivery_fijo`: a at 5000 ×2, fixed delivery 1500, fulfillment delivery gives `11500`. With fulfillment pickup it gives `10000`. With mode zone it gives `10000`.
  - `puede_enviar_requiere_eleccion`:
    - `canSend({cartCount:1, options:["pickup","delivery"], chosen:null, location:null})` is `false`.
    - With chosen `"pickup"` it is `true`.
    - With chosen `"delivery"` and no location it is `false`.
    - With `options:[]` it is `true`.
  - `mensaje_completo`: base usd, shown usd/bs/cop, rates bs 1000 and cop 3200, cart Hamburguesa mixta $5 ×2 and Polar $1,50 ×1, fixed delivery 1,5, delivery, location 7.7712,-72.2201, references "casa azul, piso 2", note "sin cebolla", greeting null, restaurant "Demo". The result equals exactly:
    ```
    Hola, quiero hacer un pedido en Demo.

    2 × Hamburguesa mixta — $10,00
    1 × Polar — $1,50

    Delivery: $1,50
    Total: $13,00 (≈ Bs 13.000,00 · COP 41.600)

    Entrega: Delivery
    Ubicación: https://maps.google.com/?q=7.77120,-72.22010
    Referencias: casa azul, piso 2
    Nota: sin cebolla

    Pedido desde El Point
    ```
  - `mensaje_base_bs`: base bs, rates bs 1000, shown bs/usd, cart a at 5000 ×1, pickup. The message contains `Total: Bs 5.000,00 (≈ $5,00)` and `Entrega: Paso a buscarlo`, and does not contain `Ubicación`.
  - `mensaje_sin_tasa_cop`: shown usd/cop with rates cop null. The total line is `Total: $5,00`, with no parenthesis, and contains no "NaN".
  - `mensaje_zona_sin_entrega`: zone delivery with options `[]`, so fulfillment is null. The message contains no `Entrega:` and no `Delivery:`.
- [ ] **Step 2: Run.** `node --test lib/order.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `lib/order.ts`.**
- [ ] **Step 4: Run.** Expected: PASS. Run `npx tsc --noEmit` too.
- [ ] **Step 5: Commit** `feat(order): lógica pura del pedido y mensaje de WhatsApp`.

### Task 4: Cart state and data for the restaurant screen

**Files:**
- Create: `lib/orderCart.tsx`
- Modify:
  - `app/_layout.tsx`: wrap the app in `OrderCartProvider`.
  - `lib/queries/restaurants.ts`: add `delivery_fee_mode`, `delivery_fee`, `menu_bs_rate_updated_at` and `menu_cop_rate_updated_at` to the select and to `RestaurantDetail`.
  - `lib/queries/menu.ts`: `MenuSettings` gains `bsUpdatedAt: string | null` and `copUpdatedAt: string | null`, read by `menuSettings`.

**Interfaces:**
- Produces:
  - `OrderCartProvider({children})`.
  - `useCart(restaurantId: string): { items: CartItem[]; qty(id: string): number; add(id: string): void; remove(id: string): void; set(id: string, qty: number): void; clear(): void }`
    - One `Map<restaurantId, CartItem[]>` held in memory. It is not persisted.
  - `usePreferredCurrency(): [Cur | null, (c: Cur) => void]`
    - AsyncStorage key `elpoint.menuCurrency`. Every read and write is wrapped in try/catch.
  - `useLastDelivery(): { value: { lat: number; lng: number; references: string } | null; save(v): void }`
    - AsyncStorage key `elpoint.lastDelivery`.

- [ ] **Step 1: Implement.** There are no unit tests for React. Proof is `npx tsc --noEmit` without new errors.
- [ ] **Step 2: Commit** `feat(order): estado del carrito y preferencias en el teléfono`.

### Task 5: Menu with rate card, selector and "+ Agregar"

**Files:**
- Modify: `components/restaurant/MenuSection.tsx`
- Create: `components/restaurant/RateCard.tsx`

**Interfaces:**
- Consumes:
  - `availableCurrencies`, `initialCurrency`, `rateAgeDays`, `rateNote`, `convertAmount`, `formatMoney` (Task 2).
  - `useCart`, `usePreferredCurrency` (Task 4).
- Produces:
  - `MenuSection({ items, settings, restaurantId, orderable, currency, onCurrencyChange })`.
  - The parent (Task 6) owns the selected `currency` so the floating bar uses the same one.
  - `RateCard({ settings, rates, bsLocal, copLocal })`. Returns null when `availableCurrencies(...).length <= 1`.

- [ ] **Step 1: RateCard.**
  - Main line: `1 $ = Bs 1.000 · COP 3.200`, with only the available currencies other than usd.
  - When the base is not usd, it is still expressed per dollar.
  - One note per currency, using `rateNote`. Use the warning color when `stale`.
- [ ] **Step 2: Segmented control `$ | Bs | COP`** under the card, only when there is more than one available currency.
- [ ] **Step 3: Dish row**, following mockup v2:
  - Name, then description.
  - A row with the price in `currency` (large), plus the base price in small type when `currency !== base`.
  - On the right: `+ Agregar`, or `− n +` when `orderable` and the dish can be added. Sold-out dishes and an expired special show no control.
  - Remove the old rate note at the foot of the menu.
- [ ] **Step 4: Verify on the device or in the web preview.** Check the selector, and a sold-out dish with no button. Run `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(menu): tarjeta de tasa, selector de moneda y agregar al pedido`.

### Task 6: Floating bar, order sheet and map picker

**Files:**
- Create:
  - `components/LocationPicker.tsx`, extracted from `app/(auth)/register-owner.tsx`.
  - `components/restaurant/OrderBar.tsx`
  - `components/restaurant/OrderSheet.tsx`
  - `components/restaurant/DeliveryLocationModal.tsx`
- Modify:
  - `app/(auth)/register-owner.tsx`: use `LocationPicker`.
  - `app/restaurant/[id].tsx`: new `canOrder`, render the bar and the sheet, and add bottom padding to the ScrollView while the bar is visible.

**Interfaces:**
- Consumes: Tasks 2 to 5.
- Produces:
  - `LocationPicker({ value, onChange, height?, onMyLocation? })`: a MapView with a fixed pin in the center and a "mi ubicación" button. Same behavior as today in registration.
  - `DeliveryLocationModal({ visible, initial, onConfirm(lat, lng), onClose })`: full screen, with a "Confirmar" button.
    - Initial position, in order: `initial` (the last saved point), then the current location if the permission is already granted or the diner grants it, then San Cristóbal.

- [ ] **Step 1: Extract `LocationPicker`.** Registration must keep working the same way (verify in the preview or on the device).
- [ ] **Step 2: `OrderBar`.**
  - Absolute, at the bottom, respecting the safe area.
  - Left: `Ver pedido · N productos` (`1 producto` in the singular). Right: the total in `currency`.
  - Visible when the pruned cart is not empty.
- [ ] **Step 3: `OrderSheet`** (`@gorhom/bottom-sheet`), in the order of section 4 of the spec:
  - Title `Tu pedido · {local}`.
  - Lines with `− n +`.
  - Fulfillment options from `fulfillmentOptions`, with labels `Paso a buscarlo` and `Delivery`. With a single option, show `Entrega: …` as text.
  - With delivery: a `Elegir ubicación de entrega` button, or a mini map with `Cambiar`. Then the `Referencias` field, then the cost line (`Delivery $1,50`, or `+ delivery según tu zona, el local te confirma`).
  - `Nota para el local (opcional)`.
  - Total, plus `≈` equivalences.
  - Green button `Enviar pedido por WhatsApp`, enabled when `canSend`. It calls `openTracked("order", whatsappUrl(...))`, saves the point and references with `useLastDelivery`, and closes the sheet without clearing the cart.
  - A `Vaciar pedido` link.
- [ ] **Step 4: `canOrder`** in `[id].tsx`: apply the Global Constraints formula. Do not change the WhatsApp row in Contacto.
- [ ] **Step 5: Verify end to end** on the device, with a test restaurant that has a plan, `accepts_orders`, Delivery and Para llevar:
  - Add dishes, open the sheet, choose delivery and a point, send.
  - WhatsApp opens with the message from section 6.
  - Run `npx tsc --noEmit`, `npx expo lint`, and `node --test lib/*.test.ts lib/**/*.test.ts`.
- [ ] **Step 6: Commit** `feat(order): barra, hoja del pedido y ubicación de entrega`.

### Task 7: Delivery cost in the owner panel

**Files:**
- Modify:
  - `components/owner/sections.tsx`: the Orders section.
  - `lib/queries/owner.ts`: add `delivery_fee_mode` and `delivery_fee` to the type, the select and `OwnerRestaurantPatch`.
  - `app/(owner)/local.tsx`: the summary.

**Interfaces:**
- Consumes: the Task 1 columns and `currencySymbol` from `lib/queries/menu.ts`.

- [ ] **Step 1: Show "Costo del delivery" only when the restaurant has the amenity `delivery`.**
  - Two choices: `Precio fijo`, with a numeric field prefixed by `currencySymbol(base)`, and `Según la zona`.
  - Save `{delivery_fee_mode, delivery_fee}` together with `accepts_orders`/`order_greeting`. With zone, `delivery_fee = null`.
  - Validate the fixed price is > 0 before saving. Otherwise show "Escribe el precio del delivery".
- [ ] **Step 2: Help text.** "El comensal arma su pedido desde tu menú y te llega listo por WhatsApp."
- [ ] **Step 3: `local.tsx` summary.**
  - When active: `Activados · delivery $1,50`, or `Activados · delivery según zona`.
  - Without the Delivery amenity: just `Activados`.
- [ ] **Step 4: Verify on the device.** Save fixed, reload, and the value persists. Run `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(owner): costo del delivery en Pedidos`.

### Task 7b: Shared link for a restaurant that opens on any phone

Context: today the share message ends with `elpoint://restaurant/{id}`. WhatsApp does not turn that into a link, and it does nothing for someone who doesn't have the app.

**Files:**
- Create: `landing/l/index.html`. It is a copy of `landing/r/index.html`:
  - The deep link is `elpoint://restaurant/{id}`, without `?rank=1`.
  - Title "Abriendo El Point…", then "Mira este local en El Point".
  - The App Store button links to `https://apps.apple.com/ve/app/el-point/id6826337907`.
- Modify: `app/restaurant/[id].tsx` (`share`). The last line becomes `Ver en El Point: https://elpoint-app.netlify.app/l?id={id}`.

- [ ] **Step 1:** Create `landing/l/index.html` and change the message.
- [ ] **Step 2:** Verify with the web preview of `landing/`.
  - `/l?id=<uuid>` shows the button with `href="elpoint://restaurant/<uuid>"`.
  - `/l?id=x` says "Enlace no válido".
- [ ] **Step 3: Commit** `fix(compartir): enlace web que abre el local en la app`.

### Task 8: Final review and iOS build

- [ ] **Step 1:** Run every check: `npx tsc --noEmit`, `npx expo lint`, `node --test` on all `*.test.ts`, and the SQL tests touched.
- [ ] **Step 2:** Final review of the branch.
- [ ] **Step 3:** Push to `main`.
- [ ] **Step 4:** `eas build -p ios --profile production --non-interactive`, in the background. Expected: the build finishes on EAS with version 1.1.0. Do not submit to App Review without the owner's confirmation ("Restaurante de Prueba" must be turned on first).
