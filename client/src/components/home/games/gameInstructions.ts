import { MIN_DISCARDS_TO_ACCUSE } from './guessWhoTypes'

export type InstructionKind = 'PAIRS' | 'OPPOSITES' | 'GUESS_WHO' | 'GUESS_WHO_GROUP' | 'DOMINO' | 'MAZE_COLLECTOR' | 'SNAKES_LADDERS' | 'DUAL_QUEST' | 'DUAL_QUEST_PIXI'
type Instruction = { text: string; exampleTitle: string; labels: [string, string, string, string]; caption: string }

/** Solo contenido: la presentación y la forma de continuar son comunes. */
export const gameInstructions: Record<InstructionKind, Instruction> = {
  DOMINO: {
    text: 'Conecta una ficha con el mismo concepto en uno de los extremos. Si no puedes jugar, roba una ficha. Gana quien se quede sin fichas primero.',
    exampleTitle: 'Ejemplo de conexión', labels: ['Paneles solares', 'Zonas verdes', 'Zonas verdes', 'Paneles solares'],
    caption: 'El concepto del extremo debe coincidir.',
  },
  PAIRS: {
    text: 'Destapa dos cartas y encuentra las imágenes iguales. Recuerda dónde están y completa las parejas de cada zona antes de que termine el tiempo.',
    exampleTitle: 'Ejemplo de pareja', labels: ['Mira', 'Recuerda', 'Destapa', 'Empareja'],
    caption: 'Dos imágenes iguales forman una pareja.',
  },
  OPPOSITES: {
    text: 'Destapa dos cartas y une cada concepto con su opuesto. Recuerda las posiciones y completa las parejas de cada zona antes de que termine el tiempo.',
    exampleTitle: 'Ejemplo de opuestos', labels: ['Limpio', 'Sucio', 'Lleno', 'Vacío'],
    caption: 'Limpio va con sucio; lleno va con vacío. Busca los opuestos de esta actividad.',
  },
  GUESS_WHO: {
    text: `Pregunta a tu rival y descarta las tarjetas que no coincidan con sus respuestas. Tras descartar al menos ${MIN_DISCARDS_TO_ACCUSE}, puedes intentar adivinar su tarjeta secreta. Gana quien acierte.`,
    exampleTitle: 'Ejemplo de una ronda', labels: ['Pregunta', 'Escucha', 'Descarta', 'Adivina'],
    caption: 'Usa las respuestas para reducir las opciones antes de adivinar.',
  },
  GUESS_WHO_GROUP: {
    text: `En cada ronda juegas contra una persona del grupo. Pregunta y descarta tarjetas; tras descartar al menos ${MIN_DISCARDS_TO_ACCUSE}, intenta adivinar la tarjeta de tu rival. Si ganas, avanzas hasta la final.`,
    exampleTitle: 'Ejemplo del torneo', labels: ['Pregunta', 'Descarta', 'Acierta', 'Avanza'],
    caption: 'Confirmen Listo para jugar. La sala necesita un número par de participantes.',
  },
  MAZE_COLLECTOR: {
    text: 'Muévete con las flechas, WASD o los controles de pantalla. Recoge todos los elementos del laberinto y evita a los enemigos: si te alcanzan, pierdes una vida.',
    exampleTitle: 'Ejemplo del recorrido', labels: ['Muévete', 'Recoge', 'Esquiva', 'Completa'],
    caption: 'Recoge todos los elementos antes de quedarte sin vidas.',
  },
  SNAKES_LADDERS: {
    text: 'En tu turno, tira el dado para avanzar. Las escaleras te hacen subir y las serpientes bajar. Responde los retos que aparezcan y llega primero a la última casilla.',
    exampleTitle: 'Ejemplo de un turno', labels: ['Tira', 'Avanza', 'Responde', 'Llega'],
    caption: 'Espera tu turno y sigue el recorrido hasta la meta.',
  },
  DUAL_QUEST: {
    text: 'Fuego y Agua juegan en equipo. Muévete con las flechas, WASD o los controles de pantalla; activa mecanismos, responde preguntas y recoge las gemas. Reúnanse en el núcleo y ordenen las piezas para completar el reto.',
    exampleTitle: 'Ejemplo de cooperación', labels: ['Explora', 'Activa', 'Recoge', 'Ordena'],
    caption: 'Cada personaje ayuda al otro a llegar al núcleo.',
  },
  DUAL_QUEST_PIXI: {
    text: 'Controlen a Lumen con A/D y a Gota con las flechas. W y ↑ sirven para saltar o nadar; S y ↓ para bucear. Cooperen con los mecanismos y lleven a ambos personajes al portal para completar el nivel.',
    exampleTitle: 'Ejemplo de cooperación', labels: ['Muévete', 'Salta', 'Coopera', 'Portal'],
    caption: 'Ambos personajes deben llegar al portal.',
  },
}
