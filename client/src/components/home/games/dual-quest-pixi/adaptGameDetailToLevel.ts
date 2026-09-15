import type { GameDetail } from '../../../../services/game.service';
import type { LevelDef } from './dualQuestPixiTypes';

/**
 * `GameDetail.config`/`content` llegan del backend como `Record<string,
 * unknown>`/`unknown[]` (el esquema de Mongo solo exige esa forma general
 * — ver `games.collection-schema.ts`; el CONTENIDO lo garantiza el
 * content-validator del servidor antes de guardar, no el cliente). Este
 * adaptador reconstruye un `LevelDef` a partir de eso, con una
 * verificación mínima en tiempo de ejecución: si el documento no tiene la
 * forma esperada, preferimos fallar con un mensaje claro a que Pixi se
 * caiga a medio armar el nivel con un `undefined` en algún lado.
 *
 * `content` (el array) SOLO trae las fichas de rompecabezas — es lo único
 * del nivel que el esquema de Mongo exige como array; todo lo demás
 * (plataformas, líquidos, ascensor, etc.) vive en `config`.
 */
export function adaptGameDetailToLevel(game: GameDetail): LevelDef {
  const config = game.config as Partial<Omit<LevelDef, 'id' | 'title' | 'puzzlePieces'>>;
  const puzzlePieces = game.content as LevelDef['puzzlePieces'];

  const missing: string[] = [];
  if (!config.widthPx) missing.push('config.widthPx');
  if (!config.heightPx) missing.push('config.heightPx');
  if (!config.fireStart) missing.push('config.fireStart');
  if (!config.waterStart) missing.push('config.waterStart');
  if (!Array.isArray(config.platforms)) missing.push('config.platforms');
  if (!config.portal) missing.push('config.portal');
  if (!config.finalReveal) missing.push('config.finalReveal');
  if (!Array.isArray(puzzlePieces)) missing.push('content (fichas de rompecabezas)');

  if (missing.length > 0) {
    throw new Error(
      `"${game.title}" no tiene la forma de un nivel de Dúo Lógico PixiJS válido — faltan: ${missing.join(', ')}.`,
    );
  }

  return {
    id: game.id,
    title: game.title,
    widthPx: config.widthPx!,
    heightPx: config.heightPx!,
    fireStart: config.fireStart!,
    waterStart: config.waterStart!,
    platforms: config.platforms!,
    liquids: config.liquids ?? [],
    crates: config.crates ?? [],
    buttons: config.buttons ?? [],
    doors: config.doors ?? [],
    bridges: config.bridges ?? [],
    puzzlePieces,
    dog: config.dog ?? null,
    portal: config.portal!,
    finalReveal: config.finalReveal!,
  };
}
