import { InvalidGameStateError } from '../errors/game.errors.js';
import { GameSlug } from '../value-objects/game-slug.vo.js';
import { GameStatus } from '../value-objects/game-status.vo.js';
import { GameType } from '../value-objects/game-type.vo.js';

export interface GameTheme {
  primaryColor: string;
  coverImageUrl: string | null;
}

/**
 * `config` y `content` son intencionalmente genéricos a nivel de dominio: su
 * forma exacta depende de `gameType` (ver `application/content-validators/`),
 * así que `Game` no necesita conocer cada tipo de juego que llegue a existir
 * — solo orquesta el ciclo de vida (quién puede editar, en qué estado está).
 */
export interface GameProps {
  id: string;
  slug: GameSlug;
  title: string;
  description: string;
  gameType: GameType;
  theme: GameTheme;
  creatorUserId: string;
  status: GameStatus;
  config: Record<string, unknown>;
  content: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGameProps {
  id: string;
  slug: GameSlug;
  title: string;
  description: string;
  gameType: GameType;
  theme: GameTheme;
  creatorUserId: string;
  config: Record<string, unknown>;
  content: unknown[];
}

export class Game {
  private props: GameProps;

  private constructor(props: GameProps) {
    this.props = props;
  }

  static create(props: CreateGameProps): Game {
    const now = new Date();

    return new Game({
      id: props.id,
      slug: props.slug,
      title: props.title,
      description: props.description,
      gameType: props.gameType,
      theme: props.theme,
      creatorUserId: props.creatorUserId,
      status: GameStatus.draft(),
      config: props.config,
      content: props.content,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: GameProps): Game {
    return new Game(props);
  }

  get id(): string {
    return this.props.id;
  }

  get slug(): GameSlug {
    return this.props.slug;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get gameType(): GameType {
    return this.props.gameType;
  }

  get theme(): GameTheme {
    return this.props.theme;
  }

  get creatorUserId(): string {
    return this.props.creatorUserId;
  }

  get status(): GameStatus {
    return this.props.status;
  }

  get config(): Record<string, unknown> {
    return this.props.config;
  }

  get content(): unknown[] {
    return this.props.content;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Regla de negocio: el creador o un ADMIN pueden editar/publicar/eliminar el juego. */
  canBeManagedBy(userId: string, requesterIsAdmin: boolean): boolean {
    return requesterIsAdmin || this.props.creatorUserId === userId;
  }

  updateDetails(input: {
    title?: string;
    description?: string;
    theme?: GameTheme;
    config?: Record<string, unknown>;
    content?: unknown[];
  }): void {
    if (this.props.status.getName() === 'REMOVED') {
      throw new InvalidGameStateError('no se puede editar un juego eliminado.');
    }

    if (input.title !== undefined) this.props.title = input.title;
    if (input.description !== undefined) this.props.description = input.description;
    if (input.theme !== undefined) this.props.theme = input.theme;
    if (input.config !== undefined) this.props.config = input.config;
    if (input.content !== undefined) this.props.content = input.content;
    this.touch();
  }

  publish(): void {
    if (this.props.status.getName() === 'REMOVED') {
      throw new InvalidGameStateError('un juego eliminado no puede publicarse.');
    }
    this.props.status = GameStatus.published();
    this.touch();
  }

  unpublish(): void {
    if (this.props.status.getName() !== 'PUBLISHED') {
      throw new InvalidGameStateError('el juego no está publicado.');
    }
    this.props.status = GameStatus.draft();
    this.touch();
  }

  /** Usado por el futuro moderador de contenido (ML) para ocultar sin borrar. */
  flag(): void {
    this.props.status = GameStatus.flagged();
    this.touch();
  }

  remove(): void {
    this.props.status = GameStatus.removed();
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  toPersistence(): GameProps {
    return { ...this.props };
  }
}
