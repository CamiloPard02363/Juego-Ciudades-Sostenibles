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
  categoryId: string;
  creatorUserId: string;
  /**
   * `null` = juego personal (dueño único: `creatorUserId`).
   * Con valor = juego institucional de esa organización.
   * No reemplaza a `creatorUserId`, que sigue siendo obligatorio y conserva
   * su significado original (quién lo hizo) incluso tras una donación.
   */
  organizationId: string | null;
  status: GameStatus;
  config: Record<string, unknown>;
  content: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contexto de autorización del solicitante sobre un juego concreto.
 * Se resuelve en la capa de aplicación (contra BD, no contra el JWT) y se
 * pasa al dominio para que la regla de "quién puede gestionar" viva acá.
 */
export interface GameManagementContext {
  /** ADMIN global de plataforma (`Role.isAdmin()`). */
  isPlatformAdmin: boolean;
  /** ADMIN de la organización **dueña de este juego** (no de cualquier otra). */
  isOwningOrganizationAdmin: boolean;
}

export interface CreateGameProps {
  id: string;
  slug: GameSlug;
  title: string;
  description: string;
  gameType: GameType;
  theme: GameTheme;
  categoryId: string;
  creatorUserId: string;
  /** Opcional: si viene, el juego nace ya como institucional de esa organización. */
  organizationId?: string | null;
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
      categoryId: props.categoryId,
      creatorUserId: props.creatorUserId,
      organizationId: props.organizationId ?? null,
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

  get categoryId(): string {
    return this.props.categoryId;
  }

  get creatorUserId(): string {
    return this.props.creatorUserId;
  }

  get organizationId(): string | null {
    return this.props.organizationId;
  }

  /** `true` si el juego pertenece a una organización (institucional). */
  isInstitutional(): boolean {
    return this.props.organizationId !== null;
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

  /**
   * Regla de negocio: pueden editar/publicar/eliminar el juego
   * 1. el ADMIN global de plataforma (sobre cualquier juego),
   * 2. el ADMIN de la organización **dueña** de este juego (solo si es
   *    institucional; ser admin de otra organización no alcanza), o
   * 3. el creador original, siempre — donar el juego no le quita el control.
   */
  canBeManagedBy(userId: string, context: GameManagementContext): boolean {
    if (context.isPlatformAdmin) {
      return true;
    }

    if (this.isInstitutional() && context.isOwningOrganizationAdmin) {
      return true;
    }

    return this.props.creatorUserId === userId;
  }

  /**
   * Dona el juego a una organización: pasa de personal a institucional.
   * `creatorUserId` NO cambia — la autoría se preserva. Quién tiene permiso
   * para donar se decide en el caso de uso (creador del juego o ADMIN de la
   * organización destino), no acá.
   */
  donateTo(organizationId: string): void {
    if (this.props.status.getName() === 'REMOVED') {
      throw new InvalidGameStateError('no se puede donar un juego eliminado.');
    }

    if (this.props.organizationId === organizationId) {
      throw new InvalidGameStateError('el juego ya pertenece a esa organización.');
    }

    if (this.props.organizationId !== null) {
      throw new InvalidGameStateError(
        'el juego ya es institucional y no puede transferirse a otra organización.',
      );
    }

    this.props.organizationId = organizationId;
    this.touch();
  }

  updateDetails(input: {
    title?: string;
    description?: string;
    theme?: GameTheme;
    categoryId?: string;
    config?: Record<string, unknown>;
    content?: unknown[];
  }): void {
    if (this.props.status.getName() === 'REMOVED') {
      throw new InvalidGameStateError('no se puede editar un juego eliminado.');
    }

    if (input.title !== undefined) this.props.title = input.title;
    if (input.description !== undefined) this.props.description = input.description;
    if (input.theme !== undefined) this.props.theme = input.theme;
    if (input.categoryId !== undefined) this.props.categoryId = input.categoryId;
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
