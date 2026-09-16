import { Injectable } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type { ContentValidator } from './content-validator.port.js';

/**
 * DUAL_QUEST_PIXI es la variante del motor PixiJS (física real, gravedad,
 * salto, nadar en el propio elemento) — mismo espíritu pedagógico que
 * DUAL_QUEST (fuego/agua, dependencia obligatoria), pero la geometría es
 * un mundo de píxeles con plataformas/líquidos/interruptores, no una
 * cuadrícula. `config` guarda todo lo que NO es un array de fichas
 * (plataformas, líquidos, cajas, botones, puertas, puentes, perro,
 * portal, imagen final); `content` es el array de fichas de
 * rompecabezas — es lo único de la forma del nivel que el esquema de
 * Mongo exige como array (ver `games.collection-schema.ts`).
 */
export type DualQuestPixiRole = 'FIRE' | 'WATER';
type Vec2 = { x: number; y: number };

const VALID_ROLES: readonly DualQuestPixiRole[] = ['FIRE', 'WATER'];
const VALID_MATERIALS = new Set(['concrete', 'dirt', 'metal']);
const VALID_LIQUID_KINDS = new Set(['WATER', 'LAVA', 'WASTE']);
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 600;
const MAX_URL_LENGTH = 500;
const MIN_DIMENSION_PX = 200;
const MAX_DIMENSION_PX = 20000;

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isVec2(value: unknown): value is Vec2 {
  return typeof value === 'object' && value !== null && isFiniteNumber((value as Vec2).x) && isFiniteNumber((value as Vec2).y);
}

function isRect(value: unknown): value is { x: number; y: number; width: number; height: number } {
  if (typeof value !== 'object' || value === null) return false;
  const rect = value as Record<string, unknown>;
  return isFiniteNumber(rect.x) && isFiniteNumber(rect.y) && isFiniteNumber(rect.width) && isFiniteNumber(rect.height) && (rect.width as number) > 0 && (rect.height as number) > 0;
}

@Injectable()
export class DualQuestPixiContentValidator implements ContentValidator {
  validateConfig(config: unknown): Record<string, unknown> {
    const raw = (config ?? {}) as Record<string, unknown>;

    if (!isFiniteNumber(raw.widthPx) || raw.widthPx < MIN_DIMENSION_PX || raw.widthPx > MAX_DIMENSION_PX) {
      throw new InvalidGameContentError(`widthPx debe ser un número entre ${MIN_DIMENSION_PX} y ${MAX_DIMENSION_PX}.`);
    }
    if (!isFiniteNumber(raw.heightPx) || raw.heightPx < MIN_DIMENSION_PX || raw.heightPx > MAX_DIMENSION_PX) {
      throw new InvalidGameContentError(`heightPx debe ser un número entre ${MIN_DIMENSION_PX} y ${MAX_DIMENSION_PX}.`);
    }
    if (!isVec2(raw.fireStart)) throw new InvalidGameContentError('fireStart necesita "x" y "y" numéricos.');
    if (!isVec2(raw.waterStart)) throw new InvalidGameContentError('waterStart necesita "x" y "y" numéricos.');
    if (!isRect(raw.portal)) throw new InvalidGameContentError('portal necesita x/y/width/height numéricos.');

    const platforms = this.validatePlatforms(raw.platforms);
    const liquids = this.validateLiquids(raw.liquids ?? []);
    const crates = this.validateCrates(raw.crates ?? []);
    const buttons = this.validateButtons(raw.buttons ?? []);
    const buttonIds = new Set(buttons.map((b) => b.id));
    const doors = this.validateDoorsOrBridges(raw.doors ?? [], buttonIds, 'doors');
    const bridges = this.validateDoorsOrBridges(raw.bridges ?? [], buttonIds, 'bridges');
    const dog = raw.dog === null || raw.dog === undefined ? null : this.validateDog(raw.dog);
    const finalReveal = this.validateFinalReveal(raw.finalReveal);

    return {
      widthPx: raw.widthPx,
      heightPx: raw.heightPx,
      fireStart: raw.fireStart,
      waterStart: raw.waterStart,
      portal: raw.portal,
      platforms,
      liquids,
      crates,
      buttons,
      doors,
      bridges,
      dog,
      finalReveal,
    };
  }

  private validatePlatforms(value: unknown): unknown[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new InvalidGameContentError('platforms necesita al menos una plataforma.');
    }
    return value.map((item, index) => {
      if (!isRect(item)) {
        throw new InvalidGameContentError(`platforms[${index}] necesita x/y/width/height numéricos.`);
      }
      const raw = item as Record<string, unknown>;
      if (!VALID_MATERIALS.has(raw.material as string)) {
        throw new InvalidGameContentError(`platforms[${index}].material debe ser concrete, dirt o metal.`);
      }
      return { x: raw.x, y: raw.y, width: raw.width, height: raw.height, material: raw.material };
    });
  }

  private validateLiquids(value: unknown): unknown[] {
    if (!Array.isArray(value)) throw new InvalidGameContentError('liquids debe ser un array.');
    return value.map((item, index) => {
      if (!isRect(item)) throw new InvalidGameContentError(`liquids[${index}] necesita x/y/width/height numéricos.`);
      const raw = item as Record<string, unknown>;
      if (!VALID_LIQUID_KINDS.has(raw.kind as string)) {
        throw new InvalidGameContentError(`liquids[${index}].kind debe ser WATER, LAVA o WASTE.`);
      }
      return { x: raw.x, y: raw.y, width: raw.width, height: raw.height, kind: raw.kind };
    });
  }

  private validateCrates(value: unknown): unknown[] {
    if (!Array.isArray(value)) throw new InvalidGameContentError('crates debe ser un array.');
    return value.map((item, index) => {
      if (!isVec2(item)) throw new InvalidGameContentError(`crates[${index}] necesita "x" y "y" numéricos.`);
      const raw = item as Record<string, unknown>;
      if (!isFiniteNumber(raw.size) || (raw.size as number) <= 0) {
        throw new InvalidGameContentError(`crates[${index}].size debe ser un número positivo.`);
      }
      return { x: raw.x, y: raw.y, size: raw.size };
    });
  }

  private validateButtons(value: unknown): Array<{ id: string; x: number; y: number; momentary: boolean }> {
    if (!Array.isArray(value)) throw new InvalidGameContentError('buttons debe ser un array.');
    const ids = new Set<string>();
    return value.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new InvalidGameContentError(`buttons[${index}] no es un objeto válido.`);
      }
      const raw = item as Record<string, unknown>;
      if (!isNonEmptyString(raw.id, 60)) throw new InvalidGameContentError(`buttons[${index}] necesita un id.`);
      if (ids.has(raw.id)) throw new InvalidGameContentError(`el id de botón "${raw.id}" está repetido.`);
      ids.add(raw.id);
      if (!isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) {
        throw new InvalidGameContentError(`buttons[${index}] necesita "x" y "y" numéricos.`);
      }
      if (typeof raw.momentary !== 'boolean') {
        throw new InvalidGameContentError(`buttons[${index}].momentary debe ser booleano.`);
      }
      return { id: raw.id, x: raw.x as number, y: raw.y as number, momentary: raw.momentary };
    });
  }

  private validateDoorsOrBridges(value: unknown, buttonIds: Set<string>, fieldName: string): unknown[] {
    if (!Array.isArray(value)) throw new InvalidGameContentError(`${fieldName} debe ser un array.`);
    const ids = new Set<string>();
    return value.map((item, index) => {
      if (!isRect(item)) throw new InvalidGameContentError(`${fieldName}[${index}] necesita x/y/width/height numéricos.`);
      const raw = item as Record<string, unknown>;
      if (!isNonEmptyString(raw.id, 60)) throw new InvalidGameContentError(`${fieldName}[${index}] necesita un id.`);
      if (ids.has(raw.id)) throw new InvalidGameContentError(`el id "${raw.id}" está repetido en ${fieldName}.`);
      ids.add(raw.id);
      if (!Array.isArray(raw.requires) || raw.requires.length === 0) {
        throw new InvalidGameContentError(`${fieldName}[${index}] necesita al menos un id en "requires".`);
      }
      for (const requiredId of raw.requires) {
        if (!buttonIds.has(requiredId as string)) {
          throw new InvalidGameContentError(`${fieldName}[${index}]: "${String(requiredId)}" no existe en buttons.`);
        }
      }
      if (raw.logic !== 'AND' && raw.logic !== 'OR') {
        throw new InvalidGameContentError(`${fieldName}[${index}].logic debe ser AND u OR.`);
      }
      return { id: raw.id, x: raw.x, y: raw.y, width: raw.width, height: raw.height, requires: raw.requires, logic: raw.logic };
    });
  }

  private validateDog(value: unknown): Vec2 {
    if (!isVec2(value)) throw new InvalidGameContentError('dog necesita "x" y "y" numéricos (o null si el nivel no lo usa).');
    return value;
  }

  private validateFinalReveal(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null) {
      throw new InvalidGameContentError('finalReveal es obligatorio.');
    }
    const raw = value as Record<string, unknown>;
    if (!isNonEmptyString(raw.title, MAX_TITLE_LENGTH)) throw new InvalidGameContentError('finalReveal.title es obligatorio.');
    if (!isNonEmptyString(raw.positiveUrl, MAX_URL_LENGTH)) throw new InvalidGameContentError('finalReveal.positiveUrl es obligatorio.');
    if (!isNonEmptyString(raw.negativeUrl, MAX_URL_LENGTH)) throw new InvalidGameContentError('finalReveal.negativeUrl es obligatorio.');
    if (!isNonEmptyString(raw.summary, MAX_BODY_LENGTH)) throw new InvalidGameContentError('finalReveal.summary es obligatorio.');
    return {
      title: (raw.title as string).trim(),
      positiveUrl: (raw.positiveUrl as string).trim(),
      negativeUrl: (raw.negativeUrl as string).trim(),
      summary: (raw.summary as string).trim(),
    };
  }

  validateContent(content: unknown): unknown[] {
    if (!Array.isArray(content) || content.length === 0) {
      throw new InvalidGameContentError('las fichas de rompecabezas (content) necesitan al menos un elemento.');
    }
    const ids = new Set<string>();
    return content.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new InvalidGameContentError(`content[${index}] no es un objeto válido.`);
      }
      const raw = item as Record<string, unknown>;

      if (!isNonEmptyString(raw.id, 60)) throw new InvalidGameContentError(`content[${index}] necesita un id.`);
      if (ids.has(raw.id)) throw new InvalidGameContentError(`el id de ficha "${raw.id}" está repetido.`);
      ids.add(raw.id);

      if (!isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) {
        throw new InvalidGameContentError(`content[${index}] necesita "x" y "y" numéricos.`);
      }
      if (raw.role !== null && !VALID_ROLES.includes(raw.role as DualQuestPixiRole)) {
        throw new InvalidGameContentError(`content[${index}].role debe ser FIRE, WATER o null.`);
      }
      if (!isNonEmptyString(raw.color, 20) || !isNonEmptyString(raw.glow, 20)) {
        throw new InvalidGameContentError(`content[${index}] necesita "color" y "glow" (hex CSS).`);
      }

      const concept = raw.concept as Record<string, unknown> | undefined;
      if (typeof concept !== 'object' || concept === null) {
        throw new InvalidGameContentError(`content[${index}].concept es obligatorio.`);
      }
      if (!isNonEmptyString(concept.title, MAX_TITLE_LENGTH)) {
        throw new InvalidGameContentError(`content[${index}].concept.title es obligatorio.`);
      }
      if (!isNonEmptyString(concept.body, MAX_BODY_LENGTH)) {
        throw new InvalidGameContentError(`content[${index}].concept.body es obligatorio.`);
      }

      return {
        id: raw.id,
        x: raw.x,
        y: raw.y,
        role: raw.role,
        color: (raw.color as string).trim(),
        glow: (raw.glow as string).trim(),
        concept: { title: (concept.title as string).trim(), body: (concept.body as string).trim() },
      };
    });
  }
}
