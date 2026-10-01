export interface ClassGameProps {
  id: string;
  classId: string;
  gameId: string;
  addedAt: Date;
  /** Archivado dentro de esta clase (issue #226): ver nota en el schema de Prisma. */
  isArchived: boolean;
}

export interface CreateClassGameProps {
  id: string;
  classId: string;
  gameId: string;
}

/**
 * Vínculo N:M entre una Class (agrupador privado de trabajo de un profesor) y
 * un Game (que vive en MongoDB, no en Postgres). El juego puede pertenecer a
 * cualquier materia, y una misma clase puede agrupar juegos de materias
 * distintas — la existencia del gameId se valida en el use-case contra el
 * repositorio de Game, no con una FK de base de datos.
 */
export class ClassGame {
  private constructor(private props: ClassGameProps) {}

  static create(props: CreateClassGameProps): ClassGame {
    return new ClassGame({
      id: props.id,
      classId: props.classId,
      gameId: props.gameId,
      addedAt: new Date(),
      isArchived: false,
    });
  }

  static fromPersistence(props: ClassGameProps): ClassGame {
    return new ClassGame(props);
  }

  get id(): string {
    return this.props.id;
  }

  get classId(): string {
    return this.props.classId;
  }

  get gameId(): string {
    return this.props.gameId;
  }

  get addedAt(): Date {
    return this.props.addedAt;
  }

  get isArchived(): boolean {
    return this.props.isArchived;
  }

  archive(): void {
    this.props.isArchived = true;
  }

  unarchive(): void {
    this.props.isArchived = false;
  }

  toPersistence(): ClassGameProps {
    return { ...this.props };
  }
}
