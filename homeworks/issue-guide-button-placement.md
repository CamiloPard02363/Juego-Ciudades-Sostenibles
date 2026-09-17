# Acercar Guía al perfil y destacarla visualmente

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/92

Agrupar Guía y perfil a la derecha de la cabecera, con una separación de 8 px.
Destacar Guía con un degradado violeta/fucsia, texto blanco y sombra suave.
Mantener las acciones, el recorrido y el primer clic obligatorio actuales.

Rama única: `fix/guide-button-placement`.

Verificar posición, contraste visual y funcionamiento en navegador para los
tres roles, además de build y lint antes de integrar en main.

Verificado en Chrome con API simulada para TEACHER, ADMIN y STUDENT:
separación de 8 px, alineación vertical, degradado y texto blanco, primer clic
obligatorio, repetición del recorrido y apertura del perfil. Captura revisada.
Build y lint aprobados con avisos existentes; diff check aprobado.

La capa oscura de la invitación se renderiza en el mismo contexto visual que
el botón para que no intercepte su clic. Se conserva el primer clic obligatorio.

Closes #92
