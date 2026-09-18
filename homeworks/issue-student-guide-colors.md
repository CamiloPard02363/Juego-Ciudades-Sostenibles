# Integrar el botón Guía en la paleta infantil

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/94

Aplicar exclusivamente a STUDENT un degradado amarillo/naranja, borde y sombra
naranjas y texto violeta oscuro, coherentes con la estética infantil.
Profesores y administradores conservan el degradado violeta/fucsia y texto blanco.
La posición, el recorrido y sus interacciones no cambian.

Rama única: `fix/student-guide-colors`.

Verificar los tres roles en navegador, además de build y lint antes del merge.

Verificación completada: Chrome con API simulada para los tres roles confirmó
colores diferenciados, posición junto al perfil, primer clic, repetición y perfil.
Captura del modo estudiante revisada. Build y lint aprobados con avisos existentes;
`git diff --check` aprobado. Cambio de código limitado a las clases del botón.

Closes #94
