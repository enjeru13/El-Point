import { LegalBullet, LegalDoc, LegalP, LegalSection } from "@/components/ui/LegalDoc";

export default function PrivacyScreen() {
  return (
    <LegalDoc title="Política de Privacidad" updated="7 de septiembre de 2026">
      <LegalP>
        Esta Política explica qué datos recoge El Point, para qué los usa y qué
        control tienes sobre ellos. Al usar la app, aceptas lo aquí descrito.
      </LegalP>

      <LegalSection n={1} title="Responsable">
        <LegalP>
          El Point (San Cristóbal, Táchira, Venezuela) es responsable del
          tratamiento de tus datos. Contacto: atencion.elpoint@gmail.com.
        </LegalP>
      </LegalSection>

      <LegalSection n={2} title="Qué datos recogemos">
        <LegalBullet>
          Cuenta: nombre de usuario, nombre (opcional), correo, contraseña cifrada. Si entras con Google: tu nombre, correo y foto de perfil.
        </LegalBullet>
        <LegalBullet>
          Ubicación aproximada: solo si la activas, para ordenar lugares por cercanía y mostrar distancias. No guardamos un historial de ubicaciones.
        </LegalBullet>
        <LegalBullet>
          Contenido que creas: reseñas, calificaciones, fotos, favoritos, preferencias de categorías.
        </LegalBullet>
        <LegalBullet>
          Datos de negocio (dueños): nombre del local, dirección, teléfono, redes, RIF y foto de fachada para la verificación. El RIF y la foto de fachada no se muestran públicamente.
        </LegalBullet>
        <LegalBullet>
          Token de notificaciones push del dispositivo, para enviarte avisos.
        </LegalBullet>
        <LegalBullet>
          Datos técnicos básicos de uso y errores para mantener la app funcionando.
        </LegalBullet>
      </LegalSection>

      <LegalSection n={3} title="Para qué usamos tus datos">
        <LegalBullet>Crear y gestionar tu cuenta y tu sesión.</LegalBullet>
        <LegalBullet>Mostrar el feed, la búsqueda, el mapa y los perfiles de locales.</LegalBullet>
        <LegalBullet>Personalizar recomendaciones según tus categorías favoritas.</LegalBullet>
        <LegalBullet>Enviar notificaciones que hayas activado.</LegalBullet>
        <LegalBullet>Verificar locales y moderar contenido reportado.</LegalBullet>
        <LegalBullet>Prevenir fraude, abuso y farmeo de puntos.</LegalBullet>
      </LegalSection>

      <LegalSection n={4} title="Con quién se comparten">
        <LegalP>
          No vendemos tus datos. Los compartimos solo con proveedores que hacen
          funcionar la app:
        </LegalP>
        <LegalBullet>Supabase — base de datos, autenticación y almacenamiento.</LegalBullet>
        <LegalBullet>Google — inicio de sesión con Google y mapas.</LegalBullet>
        <LegalBullet>Expo — servicio de notificaciones push y compilación.</LegalBullet>
        <LegalBullet>Resend — envío de correos (recuperación de contraseña).</LegalBullet>
        <LegalP>
          Tus reseñas, fotos, nombre de usuario, nivel y favoritos de locales
          son visibles para otros usuarios dentro de la app.
        </LegalP>
      </LegalSection>

      <LegalSection n={5} title="Cuánto tiempo se guardan">
        <LegalP>
          Mantenemos tus datos mientras tu cuenta exista. Si eliminas tu cuenta,
          se borran tu perfil, reseñas, fotos, favoritos y notificaciones. Un
          local que hayas registrado se mantiene visible pero sin dueño
          asignado. Podemos conservar registros mínimos de moderación si son
          necesarios para prevenir abuso.
        </LegalP>
      </LegalSection>

      <LegalSection n={6} title="Tus derechos">
        <LegalBullet>
          Acceder y corregir tus datos desde tu perfil y Ajustes.
        </LegalBullet>
        <LegalBullet>
          Eliminar tu cuenta desde Ajustes → "Eliminar mi cuenta", o desde la
          página web de eliminación de cuenta.
        </LegalBullet>
        <LegalBullet>
          Solicitar una copia de tus datos escribiendo a atencion.elpoint@gmail.com.
        </LegalBullet>
        <LegalBullet>Desactivar la ubicación o las notificaciones cuando quieras.</LegalBullet>
      </LegalSection>

      <LegalSection n={7} title="Menores">
        <LegalP>
          El Point no está dirigido a menores de 16 años. Si crees que un menor
          creó una cuenta, escríbenos y la eliminaremos.
        </LegalP>
      </LegalSection>

      <LegalSection n={8} title="Seguridad">
        <LegalP>
          Las contraseñas se guardan cifradas y la comunicación con nuestros
          servidores va por HTTPS. Ningún sistema es 100% seguro, pero aplicamos
          medidas razonables para proteger tu información.
        </LegalP>
      </LegalSection>

      <LegalSection n={9} title="Cambios">
        <LegalP>
          Si actualizamos esta Política de forma importante, te lo avisaremos en
          la app antes de que entre en vigor.
        </LegalP>
      </LegalSection>

      <LegalSection n={10} title="Contacto">
        <LegalP>
          Dudas sobre privacidad: atencion.elpoint@gmail.com.
        </LegalP>
      </LegalSection>
    </LegalDoc>
  );
}
