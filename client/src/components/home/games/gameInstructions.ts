import { MIN_DISCARDS_TO_ACCUSE } from './guessWhoTypes'
import { ArrowUp, ArrowUpDown, Brain, Check, CircleHelp, Compass, Copy, Dice5, DoorOpen, Ear, Eye, Flag, Footprints, Gem, Hand, Handshake, Layers, Leaf, Link2, MessageCircleQuestion, MoveRight, Puzzle, Search, Shield, SquareMousePointer, Sun, ToggleRight, Trophy, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type InstructionKind = 'PAIRS' | 'OPPOSITES' | 'GUESS_WHO' | 'GUESS_WHO_GROUP' | 'DOMINO' | 'MAZE_COLLECTOR' | 'SNAKES_LADDERS' | 'DUAL_QUEST' | 'DUAL_QUEST_PIXI'
type Instruction = { text: string; exampleTitle: string; labels: [string, string, string, string]; icons: [LucideIcon, LucideIcon, LucideIcon, LucideIcon]; caption: string }

/** Solo contenido: la presentación y la forma de continuar son comunes. */
export const gameInstructions: Record<InstructionKind, Instruction> = {
  DOMINO: {
    text: 'Conecta una ficha con el mismo concepto en uno de los extremos. Si no puedes jugar, roba una ficha. Gana quien se quede sin fichas primero.',
    exampleTitle: 'Ejemplo de conexión', labels: ['Paneles solares', 'Zonas verdes', 'Zonas verdes', 'Paneles solares'],
    icons: [Sun, Leaf, Leaf, Sun],
    caption: 'El concepto del extremo debe coincidir.',
  },
  PAIRS: {
    text: 'Destapa dos cartas y encuentra las imágenes iguales. Recuerda dónde están y completa las parejas de cada zona antes de que termine el tiempo.',
    exampleTitle: 'Ejemplo de pareja', labels: ['Destapa', 'Mira', 'Recuerda', 'Empareja'],
    icons: [SquareMousePointer, Eye, Brain, Copy],
    caption: 'Dos imágenes iguales forman una pareja.',
  },
  OPPOSITES: {
    text: 'Destapa dos cartas y une cada concepto con su opuesto. Recuerda las posiciones y completa las parejas de cada zona antes de que termine el tiempo.',
    exampleTitle: 'Ejemplo de opuestos', labels: ['Destapa', 'Compara', 'Opuesto', 'Une'],
    icons: [Layers, Search, ArrowUpDown, Link2],
    caption: 'Compara los conceptos y une cada carta con su opuesto.',
  },
  GUESS_WHO: {
    text: `Pregunta a tu rival y descarta las tarjetas que no coincidan con sus respuestas. Tras descartar al menos ${MIN_DISCARDS_TO_ACCUSE}, puedes intentar adivinar su tarjeta secreta. Gana quien acierte.`,
    exampleTitle: 'Ejemplo de una ronda', labels: ['Pregunta', 'Escucha', 'Descarta', 'Adivina'],
    icons: [MessageCircleQuestion, Ear, X, CircleHelp],
    caption: 'Usa las respuestas para reducir las opciones antes de adivinar.',
  },
  GUESS_WHO_GROUP: {
    text: `En cada ronda juegas contra una persona del grupo. Pregunta y descarta tarjetas; tras descartar al menos ${MIN_DISCARDS_TO_ACCUSE}, intenta adivinar la tarjeta de tu rival. Si ganas, avanzas hasta la final.`,
    exampleTitle: 'Ejemplo del torneo', labels: ['Pregunta', 'Descarta', 'Acierta', 'Avanza'],
    icons: [MessageCircleQuestion, X, Check, Trophy],
    caption: 'Adivina la tarjeta de tu rival para avanzar a la siguiente ronda.',
  },
  MAZE_COLLECTOR: {
    text: 'Muévete con las flechas, WASD o los controles de pantalla. Recoge todos los elementos del laberinto y evita a los enemigos: si te alcanzan, pierdes una vida.',
    exampleTitle: 'Ejemplo del recorrido', labels: ['Muévete', 'Recoge', 'Esquiva', 'Completa'],
    icons: [Footprints, Hand, Shield, Flag],
    caption: 'Recoge todos los elementos antes de quedarte sin vidas.',
  },
  SNAKES_LADDERS: {
    text: 'En tu turno, tira el dado para avanzar. Las escaleras te hacen subir y las serpientes bajar. Responde los retos que aparezcan y llega primero a la última casilla.',
    exampleTitle: 'Ejemplo de un turno', labels: ['Tira', 'Avanza', 'Responde', 'Llega'],
    icons: [Dice5, MoveRight, MessageCircleQuestion, Flag],
    caption: 'Tira el dado, resuelve los retos del camino y llega a la última casilla.',
  },
  DUAL_QUEST: {
    text: 'Fuego y Agua juegan en equipo. Muévete con las flechas, WASD o los controles de pantalla; activa mecanismos, responde preguntas y recoge las gemas. Reúnanse en el núcleo y ordenen las piezas para completar el reto.',
    exampleTitle: 'Ejemplo de cooperación', labels: ['Explora', 'Activa', 'Recoge', 'Ordena'],
    icons: [Compass, ToggleRight, Gem, Puzzle],
    caption: 'Activen los mecanismos, recojan las gemas y ordenen las piezas en el núcleo.',
  },
  DUAL_QUEST_PIXI: {
    text: 'Controlen a Lumen con A/D y a Gota con las flechas. W y ↑ sirven para saltar o nadar; S y ↓ para bucear. Cooperen con los mecanismos y lleven a ambos personajes al portal para completar el nivel.',
    exampleTitle: 'Ejemplo de cooperación', labels: ['Muévete', 'Salta', 'Coopera', 'Portal'],
    icons: [Footprints, ArrowUp, Handshake, DoorOpen],
    caption: 'Ambos personajes deben llegar al portal.',
  },
}
