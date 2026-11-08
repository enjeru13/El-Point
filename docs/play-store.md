# El Point en Google Play

Todo lo que pide la Play Console para publicar, listo para copiar.

## 1. Crear la app

- Nombre: **El Point**
- Idioma predeterminado: **Español (Latinoamérica) – es-419**
- App o juego: **App**
- Gratis o de pago: **Gratis**

## 2. Ficha de la tienda

**Nombre (30 caracteres máx.)**

```
El Point: dónde comer
```

**Descripción breve (80 caracteres máx.)**

```
Qué está abierto cerca, con su menú y precios en bolívares, dólares y pesos
```

**Descripción completa**

```
Deja de preguntar "¿dónde comemos?".

El Point te muestra qué está abierto ahora en San Cristóbal y qué te queda cerca, en lista o en el mapa. Mira el menú con sus precios, las fotos reales y lo que opina la gente antes de salir.

QUÉ PUEDES HACER
• Ver los locales abiertos ahora y los más cercanos a ti.
• Filtrar por categoría, precio y comodidades: aire acondicionado, wifi, sillas de bebé, estacionamiento.
• Ver el menú con precios en bolívares, dólares o pesos, a la tasa BCV del día o la que fije el local.
• Escribirle al local por WhatsApp con un toque.
• Guardar tus favoritos y enterarte de sus promos y del plato del día.

RANKEA Y SUBE DE RANGO
Cada rank que dejas suma XP. Con el XP subes de nivel y de rango: Novato, Comensal, Explorador, Crítico Local, Gurú Gastronómico y Leyenda.

COMUNIDAD
Pide recomendaciones, comparte recetas y antojos, y cuéntale a la ciudad de los locales nuevos que descubres.

¿TIENES UN LOCAL?
Regístralo desde la app y pruébalo 3 meses con el perfil completo. Los primeros 100 locales son Originales: perfil completo gratis para siempre. También puedes registrar tu cocina fantasma si solo haces delivery o pickup.

Gratis y sin publicidad. Por ahora en San Cristóbal, Táchira.
```

**Recursos gráficos**

- Ícono 512x512: `landing/store/icon-512.png`
- Gráfico de funciones 1024x500: `landing/store/feature-1024x500.png`
- Capturas de teléfono (mínimo 2): las de `marketing/store-screenshots/iphone-out/mediana_1179x2556` sirven.
- Capturas de tablet: opcionales.

**Categoría y contacto**

- Categoría: **Comida y bebida**
- Correo: atencion.elpoint@gmail.com
- Teléfono: +58 414 979 7876 (opcional)
- Sitio web: https://elpoint-app.netlify.app
- Política de privacidad: https://elpoint-app.netlify.app/privacidad

## 3. Contenido de la app (menú "Política")

**Acceso a la app:** algunas funciones necesitan cuenta. Dale a Google la cuenta de revisión:

- Comensal: `atencion.elpoint+comensal@gmail.com` con su contraseña.
- Dueño: `atencion.elpoint+dueno@gmail.com` con su contraseña.
- Antes de enviar a revisión, enciende el "Restaurante de Prueba", que está pausado.

**Anuncios:** No, la app no tiene anuncios.

**Clasificación de contenido (cuestionario IARC):**

- Categoría: Referencia, noticias o educación / otra app (no es un juego).
- Violencia, sexo, lenguaje, drogas: No.
- ¿Los usuarios pueden interactuar o intercambiar contenido? **Sí**: reseñas, fotos, posts y respuestas públicas.
- ¿Comparte la ubicación del usuario con otros? **No.**
- ¿Permite compras digitales? **No.**

**Público objetivo:** 16 años o más (lo mismo que dicen los Términos). No está dirigida a niños.

**App de noticias:** No. **App gubernamental:** No. **Funciones financieras:** No. **Salud:** No.

**Eliminar cuenta:** sí se puede, desde Ajustes en la app. URL para Google: https://elpoint-app.netlify.app/eliminar-cuenta

## 4. Seguridad de los datos

¿Recopila o comparte datos? **Sí, recopila. No comparte con terceros.**
¿Cifrado en tránsito? **Sí** (HTTPS).
¿Se pueden pedir borrar los datos? **Sí** (desde la app o por correo).

| Tipo de dato | Recopilado | Para qué | ¿Obligatorio? |
|---|---|---|---|
| Información personal › Nombre | Sí | Funcionalidad de la app, gestión de la cuenta | Opcional |
| Información personal › Correo | Sí | Gestión de la cuenta | Obligatorio |
| Información personal › IDs de usuario | Sí | Gestión de la cuenta | Obligatorio |
| Información personal › Número de teléfono | Sí, solo dueños (WhatsApp del local) | Funcionalidad de la app | Opcional |
| Fotos y videos › Fotos | Sí | Funcionalidad de la app (perfil, reseñas, local, posts) | Opcional |
| Mensajes › Otro contenido generado por el usuario | Sí (reseñas, posts, respuestas, soporte) | Funcionalidad de la app | Opcional |
| Actividad en la app › Interacciones | Sí (visitas y toques al perfil de un local, para las métricas del dueño) | Analíticas | Obligatorio |
| IDs de dispositivo › Token de notificaciones | Sí | Funcionalidad de la app (avisos) | Opcional |
| Ubicación | **No se recopila**: se usa solo en el teléfono para calcular distancias y no se envía al servidor. | | |

Nada de esto se usa para publicidad ni se vende.

## 5. Prueba cerrada (obligatoria en cuentas personales)

1. Pruebas › **Prueba cerrada** › crear pista, por ejemplo "Testers".
2. Testers: crea una lista de correos (Gmail de cada persona), **mínimo 12**.
3. Sube el `.aab` del build de producción de EAS a esa pista.
4. Comparte el enlace de inscripción ("Unirse en la Web") con los testers. Cada uno tiene que aceptar e instalar la app desde Play.
5. Deben quedarse inscritos **14 días seguidos**. Conviene invitar a 15 o 16, por si alguno se sale.
6. Pasados los 14 días: Panel › **Solicitar acceso a producción**. Google pregunta cómo fue la prueba y suele responder en unos días.

## 6. Google Sign-In en Android (no olvidar)

Huellas SHA-1 de El Point (copiadas de Play Console el 2026-11-08):

- Clave de firma de la app (Google): `A6:96:E4:93:C9:C1:F2:DF:01:67:A9:4F:ED:28:3D:EC:A2:15:20:4A`
- Clave de subida (EAS): `F2:8C:E3:74:F2:B7:69:16:EC:D3:CA:9F:20:DD:C5:33:14:1A:30:89`

Cuando Play firme la app, copia el **SHA-1 de la clave de firma de la app** (Configuración › Integridad de la app › Firma de apps). En Google Cloud Console › Credenciales, crea un cliente OAuth tipo **Android** con el paquete `com.elpoint.app` y ese SHA-1. Sin eso, "Continuar con Google" falla en la versión de la tienda.

Haz lo mismo con el SHA-1 de la clave de subida de EAS (`npx eas-cli credentials -p android`) para que funcione en los builds que no vienen de Play.

Si la llave de Google Maps tiene restricción por app Android, agrega también los dos SHA-1 con el paquete `com.elpoint.app`. Si no, el mapa sale gris.
