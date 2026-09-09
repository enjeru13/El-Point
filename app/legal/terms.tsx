import { LegalBullet, LegalDoc, LegalP, LegalSection } from "@/components/ui/LegalDoc";

export default function TermsScreen() {
  return (
    <LegalDoc title="Términos de Servicio" updated="7 de septiembre de 2026">
      <LegalP>
        Bienvenido a El Point. Estos Términos regulan el uso de la aplicación y
        sus servicios. Al crear una cuenta o usar la app, aceptas estos
        Términos. Si no estás de acuerdo, no uses El Point.
      </LegalP>

      <LegalSection n={1} title="Qué es El Point">
        <LegalP>
          El Point es una comunidad para descubrir, calificar y compartir
          lugares para comer en San Cristóbal, Táchira. Los usuarios publican
          reseñas ("ranks"), fotos y favoritos; los dueños de locales pueden
          registrar y gestionar el perfil de su restaurante.
        </LegalP>
      </LegalSection>

      <LegalSection n={2} title="Tu cuenta">
        <LegalBullet>Debes tener al menos 16 años para usar El Point.</LegalBullet>
        <LegalBullet>
          Eres responsable de la actividad de tu cuenta y de mantener segura tu
          contraseña.
        </LegalBullet>
        <LegalBullet>
          Los datos que registres (nombre de usuario, correo, ubicación
          aproximada) deben ser reales.
        </LegalBullet>
        <LegalBullet>
          Puedes eliminar tu cuenta en cualquier momento desde Ajustes. La
          eliminación borra tu perfil, reseñas, fotos y favoritos.
        </LegalBullet>
      </LegalSection>

      <LegalSection n={3} title="Contenido que publicas">
        <LegalP>
          Sigues siendo dueño de tus reseñas y fotos. Al publicarlas, nos das
          permiso para mostrarlas dentro de El Point (feed, perfil del local,
          búsqueda) mientras tu cuenta exista.
        </LegalP>
        <LegalP>No se permite publicar contenido que:</LegalP>
        <LegalBullet>Sea falso, difamatorio o engañoso.</LegalBullet>
        <LegalBullet>Contenga insultos, discurso de odio o acoso.</LegalBullet>
        <LegalBullet>Sea spam, publicidad no solicitada o enlaces maliciosos.</LegalBullet>
        <LegalBullet>Infrinja derechos de autor o de terceros.</LegalBullet>
        <LegalBullet>Incluya datos personales de otras personas sin permiso.</LegalBullet>
      </LegalSection>

      <LegalSection n={4} title="Moderación y sanciones">
        <LegalP>
          Cualquier usuario puede reportar una reseña o un local. Una reseña con
          varios reportes se oculta automáticamente hasta que un moderador la
          revise. Un moderador puede restaurarla o retirarla.
        </LegalP>
        <LegalP>
          Cada reseña retirada por incumplir estos Términos suma una falta a su
          autor. Con 3 faltas, la cuenta queda suspendida. También podemos
          suspender cuentas que abusen del sistema de puntos (XP) o de los
          reportes.
        </LegalP>
      </LegalSection>

      <LegalSection n={5} title="Dueños de locales">
        <LegalBullet>
          Solo puedes registrar un local del que seas dueño o representante
          autorizado.
        </LegalBullet>
        <LegalBullet>
          Debes aportar datos verídicos (nombre, dirección, RIF y foto de
          fachada) para la verificación.
        </LegalBullet>
        <LegalBullet>
          El equipo revisa cada local antes de publicarlo. Podemos rechazar o
          suspender un local con datos falsos o tras reportes de la comunidad.
        </LegalBullet>
        <LegalBullet>
          No puedes calificar tu propio local ni pedir a terceros que publiquen
          reseñas falsas.
        </LegalBullet>
      </LegalSection>

      <LegalSection n={6} title="Puntos, niveles y notificaciones">
        <LegalP>
          El XP, los niveles y los rangos son un elemento de juego sin valor
          monetario. Podemos ajustar la fórmula o revertir puntos obtenidos de
          forma indebida.
        </LegalP>
        <LegalP>
          Al activar las notificaciones, aceptas recibir avisos de la app
          (reacciones, respuestas, promos, moderación). Puedes desactivar cada
          tipo en Ajustes.
        </LegalP>
      </LegalSection>

      <LegalSection n={7} title="Disponibilidad y cambios">
        <LegalP>
          El Point se ofrece "tal cual". Podemos cambiar, pausar o descontinuar
          funciones sin previo aviso. Haremos lo posible por mantener el
          servicio disponible, pero no garantizamos que esté libre de errores o
          interrupciones.
        </LegalP>
      </LegalSection>

      <LegalSection n={8} title="Limitación de responsabilidad">
        <LegalP>
          El Point no es responsable de la calidad, precios, higiene ni atención
          de los locales listados, ni de la exactitud de las reseñas de otros
          usuarios. Usa tu criterio al elegir dónde comer.
        </LegalP>
      </LegalSection>

      <LegalSection n={9} title="Cambios a estos Términos">
        <LegalP>
          Si hacemos cambios importantes, te avisaremos en la app. El uso
          continuado después de un cambio implica que lo aceptas.
        </LegalP>
      </LegalSection>

      <LegalSection n={10} title="Contacto">
        <LegalP>
          Escríbenos a atencion.elpoint@gmail.com. El Point opera desde San Cristóbal,
          Táchira, Venezuela.
        </LegalP>
      </LegalSection>
    </LegalDoc>
  );
}
