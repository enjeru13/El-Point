# Migrar El Point a tu cuenta de Apple Developer

Objetivo: que los builds iOS, TestFlight y la ficha de App Store queden en **tu** equipo y no en el de tu cuñado.

## Datos de referencia

| Dato | Valor |
| --- | --- |
| Tu equipo (Team ID) | `F4LDV5N7K2` (Individual, Colombia, renueva el 6 de octubre de 2027). Se anotó del correo de aprobación del 6 de octubre; confírmalo en el paso 1. |
| Equipo viejo (tu cuñado) | `4MR3DH5C7R`, "Jesus Orejarena (Individual)". No lo uses. |
| Bundle ID | `com.elpoint.app`. Tu cuñado ya lo borró de su equipo, así que está libre. |
| Cuenta de Expo | `enjeru1304` |
| Proyecto de Expo | `El-Point` (id `38fff885-5f06-46f6-b050-fa4fd90e9954`) |
| iPad Air (UDID) | `00008112-000628A03C99A01E` |
| iPhone (UDID) | `00008110-001909223493801E` |
| Variables de entorno | Ya están guardadas en EAS para `development`, `preview` y `production` (Supabase, Google Maps, Google iOS y Web). No hay que configurar nada. |
| Inicio de sesión con Apple | Es nativo y valida contra el bundle ID. No hay cambios en Supabase. Los usuarios que entraron con Apple desde el equipo viejo quedan como usuarios nuevos (Apple asigna un identificador distinto por equipo). |
| Google Sign-In y Maps | Van atados al bundle ID, que no cambia. No hay cambios. |

## Antes de empezar

1. Ten a mano el **teléfono o dispositivo donde recibes el código de verificación en dos pasos** de tu Apple ID. Lo piden al iniciar sesión en Apple y en EAS.
2. Ten el iPhone y el iPad cerca.
3. Abre una terminal en la carpeta del proyecto: `C:\Users\Felipe\Proyectos\El-Point`.
4. Comprueba la sesión de Expo:

```bash
npx eas-cli whoami
```

Debe mostrar `enjeru1304`. Si no, inicia sesión:

```bash
npx eas-cli login
```

5. Comprueba que el repositorio está al día y qué falta por guardar:

```bash
git status --short
git pull
```

EAS construye lo que está guardado en git. Hoy solo tienes sin guardar `app/(customer)/index.tsx` (tus cambios del Home). Decide una de dos:

- **Quieres que el build lo incluya:** guárdalo.

```bash
git add "app/(customer)/index.tsx"
git commit -m "feat: cambios del Home"
git push
```

- **No lo quieres en el build:** apártalo y recupéralo al terminar.

```bash
git stash push -m "home" "app/(customer)/index.tsx"
# ...haces el build...
git stash pop
```

## Paso a paso

### 1. Confirma que tu cuenta de Apple está lista

1. Entra a https://developer.apple.com/account con el Apple ID que pagó la membresía.
2. Arriba a la derecha debe verse tu nombre y el equipo.
3. Abre **Membership details** y comprueba:
   - **Team ID:** `F4LDV5N7K2`. Si es otro, anótalo: ese es el que debes elegir en los pasos 4 y 5.
   - **Entity type:** Individual.
   - **Renewal date:** cerca del 6 de octubre de 2027.
4. Si aparece un aviso para aceptar un contrato nuevo, acéptalo.
5. Entra a https://appstoreconnect.apple.com con el mismo Apple ID y acepta lo que pida.

### 2. Confirma que el bundle ID está libre

1. En https://developer.apple.com/account, ve a **Certificates, Identifiers & Profiles**, luego **Identifiers**.
2. Verifica que `com.elpoint.app` no aparezca todavía en tu equipo (EAS lo crea en el paso 5).

### 3. Limpia las credenciales viejas en Expo

1. Entra a https://expo.dev, proyecto **El-Point**, luego **Credentials**, luego **iOS**.
2. Abre `com.elpoint.app` y elimina lo que quedó del equipo viejo: el certificado de distribución, el perfil de aprovisionamiento y la llave de notificaciones push.
3. Si no hay nada, sigue.

### 4. Registra tus dispositivos en tu equipo

```bash
npx eas-cli device:create
```

Qué responder a cada pregunta:

1. Inicio de sesión de Apple: **Sí**. Escribe tu Apple ID, tu contraseña y el código de verificación.
2. Elige el equipo: el que dice tu nombre, "Individual" y `F4LDV5N7K2`.
3. Método de registro: **Input** (escribir el UDID).
4. Pega el UDID del iPhone `00008110-001909223493801E` y ponle de nombre `iPhone`.
5. Cuando pregunte si quieres registrar otro, di que sí. Pega el del iPad `00008112-000628A03C99A01E` con nombre `iPad`.

Para verificar:

```bash
npx eas-cli device:list
```

Deben aparecer los dos dispositivos.

### 5. Crea el build

El que más usas es `preview`, porque tus actualizaciones por OTA salen por ese canal:

```bash
npx eas-cli build --platform ios --profile preview
```

Qué responder:

1. Inicio de sesión de Apple: **Sí**, con tu Apple ID.
2. Elige el equipo `F4LDV5N7K2`.
3. Cuando diga que va a registrar el bundle ID `com.elpoint.app` y activar las capacidades (Sign in with Apple y Push Notifications): **Sí**. Es automático.
4. "Generate a new Apple Distribution Certificate?": **Sí**.
5. "Generate a new Apple Provisioning Profile?": **Sí**.
6. Cuando pregunte qué dispositivos incluir: marca los dos (barra espaciadora y Enter).
7. "Set up Push Notifications / generate a new Push Key?": **Sí**.
8. Espera. Tarda entre 20 y 40 minutos (puede haber cola). Sigue el avance en el enlace que muestra la terminal.

Si necesitas además el cliente de desarrollo (para correr con servidor local):

```bash
npx eas-cli build --platform ios --profile development
```

Si te sale un error:

- **Bundle ID no disponible o ya registrado en otro equipo:** vuelve al paso 2. Si de verdad aparece en otro equipo, pide a tu cuñado que lo revise en Identifiers. Plan B: cambiar el bundle ID (por ejemplo a `com.elpoint.mobile` en `app.config.ts`, en `ios.bundleIdentifier` y `android.package`), pero eso obliga a rehacer el cliente iOS de Google y los ajustes de Apple en Supabase.
- **Límite de builds del plan de Expo alcanzado:** los créditos se reponen cada mes. Mira el uso en https://expo.dev/accounts/enjeru1304/settings/billing.
- **Error de credenciales o de perfil:** repite el paso 3 y vuelve a correr el build.

### 6. Instala en el iPhone y el iPad

1. En cada uno: Ajustes, Privacidad y seguridad, **Modo de desarrollador**, actívalo y reinicia el dispositivo. Si no aparece la opción, instala primero la app y vuelve a mirar.
2. Borra la versión vieja de El Point (la firma es de otro equipo y no se instala encima).
3. Cuando el build termine, abre desde el iPhone el enlace que da EAS, o la página del build en https://expo.dev, y toca **Install**. También puedes escanear el código QR con la cámara.
4. Abre la app. Si iOS pide confiar en el perfil: Ajustes, General, VPN y administración de dispositivos.

### 7. Comprueba que todo funciona

1. Iniciar sesión con correo.
2. Iniciar sesión con Google.
3. Iniciar sesión con Apple (entrará como usuario nuevo).
4. Recibir una notificación push (por ejemplo, favorita un local y publica una promo desde otra cuenta).
5. Mapa, búsqueda, abrir un local.
6. Publicar una actualización OTA y comprobar que llega al reiniciar la app:

```bash
npx eas-cli update --channel preview --platform ios --message "Prueba"
```

### 8. Crea la app en App Store Connect (para TestFlight y publicar)

Esto se hace después del paso 5, porque el bundle ID tiene que existir en tu equipo.

1. https://appstoreconnect.apple.com, **Apps**, botón **+**, **New App**.
2. Plataforma: iOS.
3. Nombre: "El Point". Si dice que está tomado, usa por ejemplo "El Point: dónde comer" (el nombre del ícono en el teléfono sigue siendo "El Point").
4. Idioma principal: español.
5. Bundle ID: `com.elpoint.app`.
6. SKU: `elpoint-ios`.
7. Acceso de usuario: Full Access.

Para publicar más adelante:

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios
```

Antes de enviar a revisión debes tener lista: la política de privacidad en una URL pública (`https://elpoint-app.netlify.app/privacidad.html`, sube el archivo si no está), la URL de soporte (`soporte.html`), las capturas de pantalla, y una cuenta de prueba para el revisor.

## Si algo falla

- **No te llega el código de verificación de Apple:** sin él no hay forma de seguir. Usa un dispositivo de confianza o el teléfono verificado de tu cuenta, desde appleid.apple.com.
- **EAS muestra el equipo de tu cuñado (`4MR3DH5C7R`):** iniciaste con su Apple ID o quedó una sesión vieja. Cierra la sesión de Apple y entra con el tuyo.
- **No aparece ningún equipo:** ese Apple ID no tiene la membresía, o la inscripción no está activa todavía.
- **El build termina pero no instala en el teléfono:** revisa que el UDID del dispositivo esté en el perfil (`npx eas-cli device:list`) y que el modo de desarrollador esté activado. Si agregaste un dispositivo después de crear el build, hay que repetir el build.

## Después

- Dime cuando el build instale bien y actualizo la memoria del proyecto.
- Quedan pendientes: subir a Netlify `privacidad.html`, `terminos.html`, `r/`, `qr/` y `assets/qrcode.js`.
