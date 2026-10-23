# Migrar El Point a tu cuenta de Apple Developer

Objetivo: que los builds iOS, TestFlight y la ficha de App Store queden en **tu** equipo (Team ID `F4LDV5N7K2`) y no en el de tu cuñado (`4MR3DH5C7R`).

Estado verificado el 22 de octubre de 2026:

- Todos los builds iOS hechos hasta hoy son internos (`development` y `preview`). No hay ninguno de producción, así que lo más probable es que no exista una ficha de la app en el App Store Connect de tu cuñado. Lo confirmas en el paso 3.
- Bundle ID de la app: `com.elpoint.app`. Un bundle ID solo puede vivir en un equipo a la vez, por eso tu cuñado debe borrarlo antes de que tú lo registres.
- Dispositivos a registrar: iPad Air `00008112-000628A03C99A01E` e iPhone `00008110-001909223493801E`.
- Inicio de sesión con Apple: la app usa el modo nativo, que valida contra el bundle ID. No cambia nada en Supabase. Lo único que cambia es que los usuarios que ya entraron con Apple desde el equipo viejo se verán como usuarios nuevos (Apple asigna un identificador distinto por equipo). Hoy solo afecta a cuentas de prueba.

## Antes de salir (esta noche)

1. Tu Apple ID y su contraseña. Que el teléfono o dispositivo de confianza para el código de verificación en dos pasos lo lleves contigo: sin ese código no puedes iniciar sesión.
2. Tu cuñado: su Apple ID, contraseña y el dispositivo para su código de verificación. Si no vas a estar con él, que esté disponible por llamada.
3. Laptop con el proyecto y carga. Sesión de Expo: `npx eas-cli whoami` debe decir `enjeru1304`.
4. Tarjeta o método de pago no hace falta: la membresía ya está pagada (renueva el 6 de octubre de 2027).

## Paso a paso

### 1. Confirma que tu cuenta está lista

1. Entra a https://developer.apple.com/account con tu Apple ID.
2. Arriba a la derecha debe aparecer tu equipo (Team ID `F4LDV5N7K2`) y la membresía activa.
3. Si hay un aviso para aceptar un contrato nuevo, acéptalo (solo el titular de la cuenta puede).
4. Entra también a https://appstoreconnect.apple.com y acepta lo que pida.

### 2. Revisa la cuenta de tu cuñado (con él)

1. En su sesión de https://appstoreconnect.apple.com, entra a **Apps**.
2. Si no existe ninguna app "El Point", sigue al paso 3.
3. Si existe, hay que borrarla antes (abre la app, Información de la app, "Eliminar app"). Apple solo lo permite si nunca se publicó.

### 3. Que tu cuñado borre el bundle ID

1. En su sesión de https://developer.apple.com/account, ir a **Certificates, Identifiers & Profiles**, luego **Identifiers**.
2. Abrir `com.elpoint.app` y tocar **Remove**, luego confirmar.
3. Esto también quita los perfiles de aprovisionamiento. Tus builds de desarrollo instalados dejarán de poder renovarse, por eso se instalan nuevos más adelante.
4. Espera 10 a 15 minutos antes de seguir.

### 4. Limpia las credenciales viejas en Expo

1. Entra a https://expo.dev, proyecto **El-Point**, luego **Credentials**, luego **iOS**.
2. En `com.elpoint.app`, elimina el certificado de distribución, el perfil de aprovisionamiento y la llave de push del equipo viejo.

### 5. Registra tus dispositivos en tu equipo

```bash
npx eas-cli device:create
```

1. Inicia sesión con **tu** Apple ID y elige el equipo `F4LDV5N7K2`.
2. Elige el método **Input** y pega los dos UDID de arriba (nombra uno "iPhone" y otro "iPad").

### 6. Crea el build

Tus pruebas por OTA salen por el canal `preview`, así que el que más usas es ese:

```bash
npx eas-cli build --platform ios --profile preview
```

1. Cuando pregunte por tu cuenta de Apple, inicia sesión y elige el equipo `F4LDV5N7K2`.
2. Responde que sí a registrar el bundle ID y a generar el certificado de distribución, el perfil de aprovisionamiento y la llave de notificaciones push.
3. Cuando pregunte qué dispositivos incluir, marca los dos.
4. Espera a que termine (entre 20 y 40 minutos).
5. Si dice que el bundle ID no está disponible, falta que pasen los 15 minutos del paso 3. Reintenta.

Si también necesitas el cliente de desarrollo (para correr con servidor local):

```bash
npx eas-cli build --platform ios --profile development
```

### 7. Instala

1. En el iPhone y el iPad activa el **modo desarrollador**: Ajustes, Privacidad y seguridad, Modo de desarrollador, activar y reiniciar.
2. Borra la versión vieja de El Point (la firma es de otro equipo y no se instala encima).
3. Abre el enlace del build en https://expo.dev desde el teléfono, o escanea su código QR, e instala.
4. La primera vez, iOS puede pedir confiar en el perfil: Ajustes, General, VPN y administración de dispositivos.

### 8. Comprueba que todo funciona

- Entrar con correo y con Google.
- Entrar con Apple (será un usuario nuevo).
- Recibir una notificación push.
- Abrir un local, mapa y búsqueda.
- Publicar una actualización OTA y verla llegar:
  `npx eas-cli update --channel preview --platform ios --message "Prueba"`.

### 9. Crea la app en App Store Connect (para TestFlight y publicar)

1. https://appstoreconnect.apple.com, **Apps**, botón **+**, **New App**.
2. Plataforma iOS, nombre "El Point", idioma principal español, **Bundle ID** `com.elpoint.app` (aparece después del paso 6), SKU `elpoint-ios`.
3. Más adelante, para publicar: `npx eas-cli build --platform ios --profile production` y luego `npx eas-cli submit --platform ios`.

## Si algo falla

- **No encuentra el bundle ID o el nombre está tomado:** tu cuñado no lo borró bien. Revisa el paso 3.
- **Tu cuñado no puede borrarlo:** plan B es cambiar el bundle ID a otro (por ejemplo `com.elpoint.mobile`). Eso obliga a rehacer el cliente iOS de Google OAuth y los ajustes de Apple en Supabase. No lo recomiendo.
- **No te llega el código de verificación de Apple:** sin él no hay forma de seguir; usa un dispositivo de confianza o el teléfono verificado de tu cuenta.

## Después

- Dime cuando el build instale bien y actualizo la memoria del proyecto.
- Quedan de la lista anterior: subir a Netlify `privacidad.html`, `terminos.html`, `r/`, `qr/` y `assets/qrcode.js`.
