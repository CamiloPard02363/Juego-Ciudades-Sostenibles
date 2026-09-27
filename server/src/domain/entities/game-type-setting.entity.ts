import {
  GameTypeAlreadyArchivedError,
  GameTypeNotArchivedError,
} from '../errors/game.errors.js';
import { GameType } from '../value-objects/game-type.vo.js';
import { GameTypeStatus } from '../value-objects/game-type-status.vo.js';

export interface GameTypeSettingProps {
  id: string;
  gameType: GameType;
  status: GameTypeStatus;
  displayName: string;
  description: string | null;
  archivedAt: Date | null;
  archivedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGameTypeSettingProps {
  id: string;
  gameType: GameType;
  displayName: string;
  description?: string | null;
}

/**
 * Fila de gobernanza por `GameType` (issue #156). Es una capa de
 * visibilidad TRANSVERSAL al tipo completo, deliberadamente separada del
 * `GameStatus` individual de cada instancia de `Game` (que vive en Mongo):
 * archivar/desarchivar acá nunca itera ni muta esas instancias — el cruce
 * pasa siempre por lectura en tiempo real (ver `game-factory.service.ts` y
 * `list-games.use-case.ts`).
 */
export class GameTypeSetting {
  private props: GameTypeSettingProps;

  private constructor(props: GameTypeSettingProps) {
    this.props = props;
  }

  static create(props: CreateGameTypeSettingProps): GameTypeSetting {
    const now = new Date();

    return new GameTypeSetting({
      id: props.id,
      gameType: props.gameType,
      status: GameTypeStatus.active(),
      displayName: props.displayName,
      description: props.description ?? null,
      archivedAt: null,
      archivedByUserId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: GameTypeSettingProps): GameTypeSetting {
    return new GameTypeSetting(props);
  }

  get id(): string {
    return this.props.id;
  }

  get gameType(): GameType {
    return this.props.gameType;
  }

  get status(): GameTypeStatus {
    return this.props.status;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get description(): string | null {
    return this.props.description;
  }

  get archivedAt(): Date | null {
    return this.props.archivedAt;
  }

  get archivedByUserId(): string | null {
    return this.props.archivedByUserId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isArchived(): boolean {
    return this.props.status.isArchived();
  }

  archive(byUserId: string): void {
    if (this.props.status.isArchived()) {
      throw new GameTypeAlreadyArchivedError(this.props.gameType.getName());
    }

    this.props.status = GameTypeStatus.archived();
    this.props.archivedAt = new Date();
    this.props.archivedByUserId = byUserId;
    this.touch();
  }

  unarchive(): void {
    if (!this.props.status.isArchived()) {
      throw new GameTypeNotArchivedError(this.props.gameType.getName());
    }

    this.props.status = GameTypeStatus.active();
    this.props.archivedAt = null;
    this.props.archivedByUserId = null;
    this.touch();
  }

  rename(displayName: string, description?: string | null): void {
    this.props.displayName = displayName;
    if (description !== undefined) {
      this.props.description = description;
    }
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  toPersistence(): GameTypeSettingProps {
    return { ...this.props };
  }
}
