# NexusPlay

Plataforma educativa de juegos multijugador en tiempo real para docentes, estudiantes y organizaciones, desarrollada por **NexusFactoryLab**.

Los docentes crean actividades y juegos (dominó, serpientes y escaleras, ¿Quién es?, laberinto, Dual Quest, entre otros), con apoyo de un asistente de IA que genera borradores a partir de archivos subidos. Los estudiantes juegan, estudian y compiten dentro de sus organizaciones.

## Tecnologías

| Capa | Stack |
|------|-------|
| Frontend | React, TypeScript, Vite |
| Backend | NestJS, Socket.IO, Prisma |
| Datos | PostgreSQL (relacional), MongoDB (juegos y analítica) |
| Servicios externos | Cloudinary, Google Identity Services, Google Gemini, Groq, Wikimedia Commons |
| Despliegue | Docker, Railway |

## Instalación rápida

```bash
# 1. Variables de entorno
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env

# 2. Bases de datos locales
docker compose up -d

# 3. Dependencias
npm install

# 4. Desarrollo
npm run dev:server
npm run dev:client
```

Nunca subas archivos `.env` ni claves reales al repositorio.

---

## Aviso legal

### Licencia y derechos de autor

© 2026 NexusFactoryLab. **Todos los derechos reservados.**

Este repositorio es público únicamente para consulta. Sin autorización previa y por escrito de NexusFactoryLab no está permitido copiar, modificar, redistribuir, sublicenciar ni usar el código, los diseños, las ilustraciones ni los demás contenidos con fines comerciales o en producción.

> **Nota para los mantenedores:** si se prefiere una licencia de código abierto (MIT, Apache-2.0, etc.), añadir un archivo `LICENSE` y reemplazar esta sección. Los `package.json` actuales declaran licencias distintas (`ISC` en la raíz y `UNLICENSED` en `server`) y conviene unificarlas.

### Software de terceros

El proyecto usa bibliotecas de código abierto (React, NestJS, Prisma, Socket.IO, entre otras), cada una bajo su propia licencia. Consulta el listado en [LICENSES.md](LICENSES.md). Los nombres y logotipos de terceros pertenecen a sus propietarios.

### Contenido de terceros

Las imágenes que el asistente de IA obtiene de Wikipedia o Wikimedia Commons conservan su licencia y atribución originales (por ejemplo Creative Commons). Quien las publique es responsable de respetarlas. Los usuarios deben subir únicamente contenido propio o con derecho a usarlo.

### Protección de datos personales

NexusPlay trata datos personales de usuarios (nombre, correo, rol, organización, actividad de juego y analítica de uso). Quien despliegue la plataforma es responsable del tratamiento y debe:

- Informar de forma clara qué datos se recogen y con qué finalidad.
- Cumplir la normativa aplicable (en Colombia, la Ley 1581 de 2012 y el Decreto 1377 de 2013; en la UE, el RGPD; en EE. UU., COPPA y FERPA cuando corresponda).
- Obtener el consentimiento de las personas o de sus representantes legales.
- Permitir acceso, rectificación y eliminación de los datos.

Las contraseñas se almacenan cifradas con hash (bcrypt). La analítica de uso es opcional y se activa con `ANALYTICS_ENABLED`.

### Menores de edad

La plataforma está pensada para uso educativo y puede ser usada por menores. Las instituciones u organizaciones que la utilicen son responsables de obtener la autorización de padres, madres o tutores legales antes de registrar a estudiantes menores de edad.

### Inteligencia artificial

El asistente de IA envía el contenido que el docente sube a proveedores externos (Google Gemini y, como respaldo, Groq). No subas datos personales, sensibles ni confidenciales de terceros. Los resultados pueden contener errores o sesgos y **deben ser revisados por una persona** antes de usarse con estudiantes. Cada proveedor aplica sus propios términos y políticas de privacidad.

### Servicios externos

El uso de Google Identity Services, Cloudinary, Google AI Studio, Groq y Wikimedia está sujeto a los términos de cada servicio. Cada despliegue debe usar sus propias credenciales y cumplir los límites de uso de cada uno.

### Exención de garantías y responsabilidad

El software se entrega **"tal cual"**, sin garantías de ningún tipo, expresas o implícitas, incluidas las de comercialización, idoneidad para un propósito particular y no infracción. NexusFactoryLab no será responsable por daños, pérdida de datos o perjuicios derivados del uso del software.

### Marcas

"NexusPlay" y "NexusFactoryLab" son nombres de sus titulares. Su uso requiere autorización.

### Seguridad y contacto

Si encuentras una vulnerabilidad, **no la publiques en un issue**. Repórtala de forma privada a los mantenedores de [NexusFactoryLab](https://github.com/NexusFactoryLab).

---

*Este documento es informativo y no constituye asesoría legal. Antes de operar la plataforma con usuarios reales, consulta a un profesional jurídico.*
