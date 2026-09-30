import { PublicPageLayout } from './PublicPageLayout'

export function PrivacyPolicyPage() {
  return (
    <PublicPageLayout title="Política de Privacidad">
      <p className="text-[13px] text-text">Última actualización: septiembre de 2026.</p>

      <p>
        Esta Política de Privacidad describe cómo NexusPlay ("la aplicación", "nosotros") recopila,
        usa y protege la información de las personas que usan la plataforma.
      </p>

      <h2 className="mt-4 font-heading text-lg font-semibold text-text-h">
        Información que recopilamos
      </h2>
      <p>
        Cuando creas una cuenta recopilamos tu nombre, correo electrónico y, si eliges iniciar
        sesión con Google, la información básica de perfil que ese proveedor comparte con nuestro
        consentimiento (nombre, correo, foto de perfil). También almacenamos tu progreso dentro de
        los juegos, las clases u organizaciones a las que perteneces, y datos técnicos básicos de
        uso (fecha de último acceso, tipo de dispositivo).
      </p>

      <h2 className="mt-4 font-heading text-lg font-semibold text-text-h">
        Cómo usamos tu información
      </h2>
      <p>
        Usamos estos datos únicamente para operar la plataforma: autenticarte, guardar tu
        progreso, permitir que profesores gestionen sus clases, y mejorar la experiencia educativa.
        No vendemos ni compartimos tu información personal con terceros con fines publicitarios.
      </p>

      <h2 className="mt-4 font-heading text-lg font-semibold text-text-h">
        Inicio de sesión con proveedores externos
      </h2>
      <p>
        Si inicias sesión con Google (u otro proveedor externo en el futuro), únicamente
        solicitamos los permisos mínimos necesarios para identificarte (correo, nombre, foto de
        perfil). No accedemos a tu contraseña ni a otra información de tu cuenta de Google.
      </p>

      <h2 className="mt-4 font-heading text-lg font-semibold text-text-h">
        Conservación y eliminación de datos
      </h2>
      <p>
        Conservamos tu información mientras tu cuenta esté activa. Puedes solicitar la eliminación
        de tu cuenta y de tus datos personales en cualquier momento escribiendo al correo de
        soporte indicado abajo.
      </p>

      <h2 className="mt-4 font-heading text-lg font-semibold text-text-h">Contacto</h2>
      <p>
        Si tienes preguntas sobre esta política o quieres ejercer tus derechos sobre tus datos,
        escríbenos a{' '}
        <a
          href="mailto:soporte@nexusplay.app"
          className="font-medium text-accent hover:underline"
        >
          soporte@nexusplay.app
        </a>
        .
      </p>
    </PublicPageLayout>
  )
}
