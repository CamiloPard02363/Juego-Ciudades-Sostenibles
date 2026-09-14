import { Injectable } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type { ContentValidator } from './content-validator.port.js';

export type DualQuestRole = 'FIRE' | 'WATER';
export type DualQuestCellPosition = { row: number; col: number };

export interface DualQuestGate {
  gateId: string;
  position: DualQuestCellPosition;
}

export type DualQuestTriggerKind = 'SWITCH' | 'QUESTION';

/**
 * Un trigger es la mecánica de dependencia obligatoria: un rol activa algo
 * en su lado del mapa para abrir una compuerta que bloquea al OTRO rol.
 * `SWITCH` abre al toque; `QUESTION` exige responder bien antes de abrir
 * (el "mini-puzzle conceptual" que puede fallar y hay que reintentar).
 */
export interface DualQuestTrigger {
  triggerId: string;
  kind: DualQuestTriggerKind;
  activatedByRole: DualQuestRole;
  switchPosition: DualQuestCellPosition;
  gateId: string;
  prompt?: string;
  options?: string[];
  correctOptionIndex?: number;
}

export interface DualQuestConfig {
  /** La "hipótesis" que se arma al final en la Gema Núcleo. */
  coreQuestion: string;
  gridCols: number;
  gridRows: number;
  /** 0 = libre, 1 = muro, 2 = solo pasable por FIRE, 3 = solo pasable por WATER. */
  grid: number[][];
  fireStart: DualQuestCellPosition;
  waterStart: DualQuestCellPosition;
  /** Casilla donde ambos roles deben coincidir para abrir el ensamblaje de la Gema Núcleo. */
  corePosition: DualQuestCellPosition;
  gates: DualQuestGate[];
  triggers: DualQuestTrigger[];
}

/** Un fragmento de concepto: solo el rol dueño puede recogerlo. `order` define su lugar en la secuencia correcta de ensamblaje. */
export interface DualQuestFragmentGem {
  gemId: string;
  role: DualQuestRole;
  position: DualQuestCellPosition;
  label: string;
  order: number;
}

const MIN_GRID_COLS = 8;
const MAX_GRID_COLS = 24;
const MIN_GRID_ROWS = 6;
const MAX_GRID_ROWS = 18;
const VALID_CELL_VALUES = new Set([0, 1, 2, 3]);
const VALID_ROLES: readonly DualQuestRole[] = ['FIRE', 'WATER'];
const VALID_TRIGGER_KINDS: readonly DualQuestTriggerKind[] = ['SWITCH', 'QUESTION'];

const MAX_LABEL_LENGTH = 120;
const MAX_PROMPT_LENGTH = 300;
const MAX_OPTION_LENGTH = 120;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
/** Mínimo 2 por rol: con menos no hay nada real que ensamblar entre los dos. */
const MIN_GEMS_PER_ROLE = 2;

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isPosition(value: unknown): value is DualQuestCellPosition {
  return (
    typeof value === 'object' &&
    value !== null &&
    Number.isInteger((value as DualQuestCellPosition).row) &&
    Number.isInteger((value as DualQuestCellPosition).col)
  );
}

/**
 * Valida config y content para DUAL_QUEST — dos roles complementarios
 * recorren el mismo mapa (cada uno bloqueado por casillas propias del
 * otro), dependen el uno del otro mediante triggers/compuertas, y arman un
 * concepto juntos ensamblando los fragmentos que cada uno recolectó. La
 * narrativa (Fuego/Agua, Frontend/Backend, o cualquier otro par) es
 * enteramente de los `label`/`prompt` del contenido, nunca hardcodeada acá.
 */
@Injectable()
export class DualQuestContentValidator implements ContentValidator {
  validateConfig(config: unknown): Record<string, unknown> {
    const raw = (config ?? {}) as Partial<DualQuestConfig>;

    if (!isNonEmptyString(raw.coreQuestion, MAX_PROMPT_LENGTH)) {
      throw new InvalidGameContentError('coreQuestion es obligatorio.');
    }

    if (
      !Number.isInteger(raw.gridCols) ||
      raw.gridCols! < MIN_GRID_COLS ||
      raw.gridCols! > MAX_GRID_COLS
    ) {
      throw new InvalidGameContentError(`gridCols debe ser un entero entre ${MIN_GRID_COLS} y ${MAX_GRID_COLS}.`);
    }
    if (
      !Number.isInteger(raw.gridRows) ||
      raw.gridRows! < MIN_GRID_ROWS ||
      raw.gridRows! > MAX_GRID_ROWS
    ) {
      throw new InvalidGameContentError(`gridRows debe ser un entero entre ${MIN_GRID_ROWS} y ${MAX_GRID_ROWS}.`);
    }
    const gridCols = raw.gridCols!;
    const gridRows = raw.gridRows!;

    const grid = this.validateGrid(raw.grid, gridRows, gridCols);

    const fireStart = this.validatePassablePosition(raw.fireStart, grid, 'fireStart', 'FIRE');
    const waterStart = this.validatePassablePosition(raw.waterStart, grid, 'waterStart', 'WATER');
    const corePosition = this.validateCorePosition(raw.corePosition, grid);

    const gates = this.validateGates(raw.gates, grid);
    const gateIds = new Set(gates.map((g) => g.gateId));
    const triggers = this.validateTriggers(raw.triggers, grid, gateIds);

    // La dependencia obligatoria no existe si una compuerta declarada no
    // tiene ningún trigger que la abra — quedaría bloqueada para siempre.
    const gatesWithTrigger = new Set(triggers.map((t) => t.gateId));
    for (const gate of gates) {
      if (!gatesWithTrigger.has(gate.gateId)) {
        throw new InvalidGameContentError(`la compuerta "${gate.gateId}" no tiene ningún trigger que la abra.`);
      }
    }

    return {
      coreQuestion: (raw.coreQuestion as string).trim(),
      gridCols,
      gridRows,
      grid,
      fireStart,
      waterStart,
      corePosition,
      gates,
      triggers,
    };
  }

  private validateGrid(value: unknown, rows: number, cols: number): number[][] {
    if (!Array.isArray(value) || value.length !== rows) {
      throw new InvalidGameContentError(`grid debe tener exactamente ${rows} filas.`);
    }
    return value.map((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== cols) {
        throw new InvalidGameContentError(`grid[${rowIndex}] debe tener exactamente ${cols} columnas.`);
      }
      return row.map((cell, colIndex) => {
        if (!VALID_CELL_VALUES.has(cell)) {
          throw new InvalidGameContentError(`grid[${rowIndex}][${colIndex}] debe ser 0, 1, 2 o 3.`);
        }
        return cell as number;
      });
    });
  }

  private isPassableFor(grid: number[][], position: DualQuestCellPosition, role: DualQuestRole): boolean {
    const cell = grid[position.row]?.[position.col];
    if (cell === undefined) return false;
    if (cell === 1) return false;
    if (cell === 2) return role === 'FIRE';
    if (cell === 3) return role === 'WATER';
    return true;
  }

  private validatePassablePosition(
    value: unknown,
    grid: number[][],
    fieldName: string,
    role: DualQuestRole,
  ): DualQuestCellPosition {
    if (!isPosition(value)) {
      throw new InvalidGameContentError(`${fieldName} necesita "row" y "col" enteros.`);
    }
    if (!this.isPassableFor(grid, value, role)) {
      throw new InvalidGameContentError(`${fieldName} debe caer en una casilla pasable para ${role}.`);
    }
    return value;
  }

  private validateCorePosition(value: unknown, grid: number[][]): DualQuestCellPosition {
    if (!isPosition(value)) {
      throw new InvalidGameContentError('corePosition necesita "row" y "col" enteros.');
    }
    if (grid[value.row]?.[value.col] !== 0) {
      throw new InvalidGameContentError('corePosition debe caer en una casilla libre, pasable para ambos roles.');
    }
    return value;
  }

  private validateGates(value: unknown, grid: number[][]): DualQuestGate[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new InvalidGameContentError('gates necesita al menos una compuerta.');
    }
    const ids = new Set<string>();
    return value.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new InvalidGameContentError(`gates[${index}] no es un objeto válido.`);
      }
      const raw = item as Record<string, unknown>;
      if (!isNonEmptyString(raw.gateId, 60)) {
        throw new InvalidGameContentError(`gates[${index}] necesita un gateId.`);
      }
      if (ids.has(raw.gateId)) {
        throw new InvalidGameContentError(`el gateId "${raw.gateId}" está repetido.`);
      }
      ids.add(raw.gateId);
      if (!isPosition(raw.position) || grid[raw.position.row]?.[raw.position.col] !== 0) {
        throw new InvalidGameContentError(
          `gates[${index}] necesita "position" sobre una casilla libre (0) — la compuerta nace cerrada ahí.`,
        );
      }
      return { gateId: raw.gateId, position: raw.position };
    });
  }

  private validateTriggers(value: unknown, grid: number[][], gateIds: Set<string>): DualQuestTrigger[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new InvalidGameContentError('triggers necesita al menos uno.');
    }
    const ids = new Set<string>();
    return value.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new InvalidGameContentError(`triggers[${index}] no es un objeto válido.`);
      }
      const raw = item as Record<string, unknown>;

      if (!isNonEmptyString(raw.triggerId, 60)) {
        throw new InvalidGameContentError(`triggers[${index}] necesita un triggerId.`);
      }
      if (ids.has(raw.triggerId)) {
        throw new InvalidGameContentError(`el triggerId "${raw.triggerId}" está repetido.`);
      }
      ids.add(raw.triggerId);

      if (!VALID_TRIGGER_KINDS.includes(raw.kind as DualQuestTriggerKind)) {
        throw new InvalidGameContentError(`triggers[${index}] necesita kind SWITCH o QUESTION.`);
      }
      if (!VALID_ROLES.includes(raw.activatedByRole as DualQuestRole)) {
        throw new InvalidGameContentError(`triggers[${index}] necesita activatedByRole FIRE o WATER.`);
      }
      if (!isNonEmptyString(raw.gateId, 60) || !gateIds.has(raw.gateId)) {
        throw new InvalidGameContentError(`triggers[${index}] necesita un gateId que exista en "gates".`);
      }
      if (!isPosition(raw.switchPosition)) {
        throw new InvalidGameContentError(`triggers[${index}] necesita switchPosition con "row" y "col".`);
      }
      if (!this.isPassableFor(grid, raw.switchPosition, raw.activatedByRole as DualQuestRole)) {
        throw new InvalidGameContentError(
          `triggers[${index}]: switchPosition debe ser pasable para ${raw.activatedByRole as string}.`,
        );
      }

      const trigger: DualQuestTrigger = {
        triggerId: raw.triggerId,
        kind: raw.kind as DualQuestTriggerKind,
        activatedByRole: raw.activatedByRole as DualQuestRole,
        switchPosition: raw.switchPosition,
        gateId: raw.gateId,
      };

      if (trigger.kind === 'QUESTION') {
        if (!isNonEmptyString(raw.prompt, MAX_PROMPT_LENGTH)) {
          throw new InvalidGameContentError(`triggers[${index}] (QUESTION) necesita un prompt.`);
        }
        if (!Array.isArray(raw.options) || raw.options.length < MIN_OPTIONS || raw.options.length > MAX_OPTIONS) {
          throw new InvalidGameContentError(
            `triggers[${index}] (QUESTION) necesita entre ${MIN_OPTIONS} y ${MAX_OPTIONS} opciones.`,
          );
        }
        const options = raw.options.map((option: unknown, optionIndex: number) => {
          if (!isNonEmptyString(option, MAX_OPTION_LENGTH)) {
            throw new InvalidGameContentError(`triggers[${index}]: la opción ${optionIndex} es inválida.`);
          }
          return option.trim();
        });
        if (
          !Number.isInteger(raw.correctOptionIndex) ||
          (raw.correctOptionIndex as number) < 0 ||
          (raw.correctOptionIndex as number) >= options.length
        ) {
          throw new InvalidGameContentError(
            `triggers[${index}] (QUESTION) necesita correctOptionIndex dentro del rango de sus opciones.`,
          );
        }
        trigger.prompt = (raw.prompt as string).trim();
        trigger.options = options;
        trigger.correctOptionIndex = raw.correctOptionIndex as number;
      }

      return trigger;
    });
  }

  validateContent(content: unknown, config?: Record<string, unknown>): unknown[] {
    if (!config) {
      throw new InvalidGameContentError('el contenido de DUAL_QUEST necesita el config ya validado.');
    }
    const grid = config.grid as number[][];
    return this.validateFragmentGems(content, grid);
  }

  private validateFragmentGems(value: unknown, grid: number[][]): DualQuestFragmentGem[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new InvalidGameContentError('fragmentGems necesita al menos una gema.');
    }

    const gems = value.map((item, index) => this.validateGem(item, index, grid));

    const idSet = new Set<string>();
    const countByRole: Record<DualQuestRole, number> = { FIRE: 0, WATER: 0 };
    for (const gem of gems) {
      if (idSet.has(gem.gemId)) {
        throw new InvalidGameContentError(`el gemId "${gem.gemId}" está repetido.`);
      }
      idSet.add(gem.gemId);
      countByRole[gem.role] += 1;
    }
    for (const role of VALID_ROLES) {
      if (countByRole[role] < MIN_GEMS_PER_ROLE) {
        throw new InvalidGameContentError(`se necesitan al menos ${MIN_GEMS_PER_ROLE} gemas del rol ${role}.`);
      }
    }

    // `order` debe cubrir 1..N sin huecos ni repetidos entre AMBOS roles —
    // es la secuencia única del rompecabezas de ensamblaje final.
    const orders = gems.map((g) => g.order).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        throw new InvalidGameContentError('el campo "order" de fragmentGems debe cubrir 1..N sin huecos ni repetidos.');
      }
    }

    return gems;
  }

  private validateGem(item: unknown, index: number, grid: number[][]): DualQuestFragmentGem {
    if (typeof item !== 'object' || item === null) {
      throw new InvalidGameContentError(`fragmentGems[${index}] no es un objeto válido.`);
    }
    const raw = item as Record<string, unknown>;

    if (!isNonEmptyString(raw.gemId, 60)) {
      throw new InvalidGameContentError(`fragmentGems[${index}] necesita un gemId.`);
    }
    if (!VALID_ROLES.includes(raw.role as DualQuestRole)) {
      throw new InvalidGameContentError(`fragmentGems[${index}] necesita role FIRE o WATER.`);
    }
    const role = raw.role as DualQuestRole;
    if (!isPosition(raw.position) || !this.isPassableFor(grid, raw.position, role)) {
      throw new InvalidGameContentError(`fragmentGems[${index}]: position debe ser pasable para ${role}.`);
    }
    if (!isNonEmptyString(raw.label, MAX_LABEL_LENGTH)) {
      throw new InvalidGameContentError(`fragmentGems[${index}] necesita un label.`);
    }
    if (!Number.isInteger(raw.order) || (raw.order as number) < 1) {
      throw new InvalidGameContentError(`fragmentGems[${index}] necesita un order entero positivo.`);
    }

    return {
      gemId: raw.gemId,
      role,
      position: raw.position,
      label: (raw.label as string).trim(),
      order: raw.order as number,
    };
  }
}
