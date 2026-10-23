# Ficha de El Point en la App Store

Todo listo para copiar y pegar en App Store Connect (https://appstoreconnect.apple.com). Los textos no mencionan precios ni cómo se paga, por la política de las tiendas.

## 1. Crear la app

Apps, botón **+**, **New App**:

| Campo | Valor |
| --- | --- |
| Platforms | iOS |
| Name | El Point (máximo 30 caracteres; si está tomado: `El Point: dónde comer`) |
| Primary Language | Spanish (Mexico) o Spanish (Spain); cualquiera sirve para Venezuela y Colombia |
| Bundle ID | `com.elpoint.app` |
| SKU | `elpoint-ios` |
| User Access | Full Access |

El nombre que ve la gente bajo el ícono sigue siendo "El Point", aunque el de la tienda sea otro.

## 2. Información de la app (App Information)

| Campo | Valor |
| --- | --- |
| Subtitle (máx. 30) | Dónde comer en San Cristóbal |
| Category, principal | Food & Drink |
| Category, secundaria | Lifestyle |
| Content Rights | La app contiene contenido de terceros (reseñas y fotos de usuarios, que ellos suben): responde **Sí** y que tienes los derechos o permiso para usarlo. |

## 3. Ficha de la versión 1.0

**Promotional Text (máx. 170):**

```
Encuentra restaurantes, cafés y cocinas cerca de ti, mira su menú y deja tu rank. Gana XP y sube de nivel mientras descubres San Cristóbal.
```

**Description (máx. 4000):**

```
El Point es la guía para descubrir dónde comer en San Cristóbal, Táchira. Encuentra el lugar que se te antoja, mira cómo es antes de ir y cuéntale a la comunidad cómo te fue.

PARA COMENSALES
• Descubre locales por categoría, cercanía y si están abiertos ahora, en una lista o en el mapa.
• Busca por nombre, categoría, comodidades y métodos de pago.
• Mira fotos, menú con precios, horario y promociones de cada local.
• Contacta al local por WhatsApp, llamada o Instagram, y pide por WhatsApp con el mensaje listo.
• Deja tu rank con estrellas, fotos y comentario. Cada rank te da XP: sube de nivel y de rango.
• Guarda tus favoritos y recibe avisos de promociones y del plato del día.
• Cocinas fantasma: negocios sin local físico que venden por delivery o pickup.
• Modo claro y oscuro.

PARA DUEÑOS DE LOCALES
• Registra tu local y aparece en el mapa y en las búsquedas.
• Con el perfil completo, tus clientes ven tu contacto, tu menú con precios en dólares, bolívares o pesos, tu plato del día, tu galería de fotos, tu horario y tus promociones.
• Responde las reseñas de tus clientes y consigue más con tu cartel QR "Rankéanos".
• Mira cuántas personas te ven y te contactan, por qué canal y qué días funcionan mejor.

El Point nace en San Cristóbal y crece con su gente. Descárgala y deja tu rank.
```

**Keywords (máx. 100 caracteres, separadas por comas, sin espacios):**

```
restaurantes,comida,café,delivery,menú,reseñas,San Cristóbal,Táchira,Venezuela,cocina,ranking,mapa
```

**URLs:**

| Campo | Valor |
| --- | --- |
| Support URL | https://elpoint-app.netlify.app/soporte.html |
| Marketing URL | https://elpoint-app.netlify.app/ |
| Privacy Policy URL | https://elpoint-app.netlify.app/privacidad.html |

**Copyright:** `2026 Angel Eduardo Cegarra Taborda`

Antes de enviar, sube a Netlify `privacidad.html`, `soporte.html` y `terminos.html` y comprueba que las tres URL abren.

## 4. Clasificación por edad (Age Rating)

Responde el cuestionario con honestidad. Lo que aplica a El Point:

- **Contenido generado por usuarios:** Sí (reseñas, fotos y comentarios). Hay reportes, moderación y contacto de soporte.
- **Alcohol, tabaco o drogas (referencias):** posible mención leve, porque hay bares y cafés. Marca "poco frecuente / leve" si el cuestionario lo pregunta.
- **Apuestas, violencia, contenido sexual, terror, medicina:** No.
- **Acceso web sin restricciones:** No.

## 5. Privacidad de la app (App Privacy)

Pregunta inicial: "¿Recopilan datos de esta app?" **Sí**. Seguimiento (Tracking): **No** (no hay publicidad ni se comparte con terceros para rastrear).

| Tipo de dato | Para qué | Vinculado a la identidad del usuario |
| --- | --- | --- |
| Contact Info: Name, Email Address | App Functionality (cuenta) | Sí |
| User Content: Photos, Other User Content (reseñas, comentarios) | App Functionality | Sí |
| User Content: Customer Support (mensajes a soporte) | App Functionality | Sí |
| Identifiers: User ID, Device ID (token de notificaciones) | App Functionality | Sí |
| Usage Data: Product Interaction (visitas y toques a un local) | Analytics, App Functionality | Sí |
| Location: Precise Location (para ordenar por cercanía; no se guarda historial) | App Functionality | No |

Si el cuestionario pregunta por datos de terceros: Google (inicio de sesión y mapas) y Apple (inicio de sesión) son los proveedores de autenticación.

## 6. Notas para el revisor (App Review Information)

**Sign-in required:** Sí. Crea dos cuentas de prueba y pon aquí sus datos:

- Comensal: correo y contraseña (los creas tú antes de enviar).
- Dueño de local con plan activo: correo y contraseña (un local aprobado con plan para que el revisor vea todo).

**Notes** (pega y ajusta):

```
El Point es una guía de restaurantes de San Cristóbal, Venezuela. Los usuarios descubren locales, ven su menú y dejan reseñas con estrellas, fotos y comentarios. Los dueños registran su local y lo administran desde la pestaña "Mi local".

Inicio de sesión: correo y contraseña, Google y Apple.

La app no vende nada dentro de ella y no muestra precios de planes. Las funciones del perfil completo de un local las activa nuestro equipo desde un panel administrativo.

Contenido de usuarios: las reseñas se pueden reportar (botón "Reportar" en cada reseña) y los locales también ("Reportar este local"). Cada reseña ajena tiene un botón "Bloquear" para dejar de ver a esa persona; los bloqueados se gestionan en Ajustes, "Usuarios bloqueados". Un equipo de moderación revisa los reportes. Contacto de soporte: atencion.elpoint@gmail.com y desde la app, en Ajustes, "Ayuda y soporte".

Para eliminar la cuenta: Ajustes, "Eliminar cuenta".

Cuentas de prueba: ver arriba.
```

**Contact Information:** tu nombre, teléfono y correo (el revisor puede llamarte).

## 7. Capturas de pantalla

Apple las pide por tamaño de pantalla y muestra las medidas exactas al subirlas:

- **iPhone 6.9"** (por ejemplo 1320 x 2868): de 3 a 10 capturas.
- **iPad 13"** (por ejemplo 2064 x 2752): obligatorias porque la app soporta iPad.

Sugerencia de 6 capturas, en este orden: Inicio, Mapa, Perfil de un local (con menú y fotos), Búsqueda con filtros, Dejar un rank, Mi local (dueño).

Las imágenes de `landing/shots` son para la web, no cumplen estas medidas.

## 8. Antes de enviar a revisión

- [ ] Páginas `privacidad.html`, `soporte.html`, `terminos.html` subidas a Netlify.
- [ ] Cuentas de prueba (comensal y dueño con plan) creadas y funcionando.
- [ ] Capturas de iPhone y iPad subidas.
- [ ] Formulario de privacidad completo.
- [ ] Países: Venezuela y Colombia. Si no eliges la Unión Europea evitas el formulario de comerciante (DSA).
- [x] Bloquear usuarios: hecho (botón "Bloquear" en cada reseña y lista en Ajustes). Requiere `npx supabase db push` con la migración `20261003000000_user_blocks.sql`.
- [ ] Build de producción subido (sección siguiente).

## 9. Subir el build a TestFlight y a la App Store

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios
```

1. El primer comando genera un build firmado para la App Store (distinto del ad hoc de `preview`). EAS crea solo el perfil de distribución; inicia sesión en Apple si lo pide.
2. El segundo lo sube a App Store Connect. Si pregunta por una llave de la App Store Connect API, deja que EAS la genere con tu inicio de sesión de Apple.
3. En App Store Connect, el build aparece en **TestFlight** al cabo de unos minutos (primero "Processing").
4. **Probadores internos:** Users and Access, agrega personas con rol de la cuenta, y aparecen en TestFlight. Hasta 100, sin revisión.
5. **Probadores externos:** hasta 10.000 por correo o enlace público. El primer build pasa una revisión corta de Apple.
6. Para publicar: en la versión 1.0 elige ese build, completa la ficha y toca **Add for Review**.
