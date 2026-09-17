export interface ClassGameProps {
  id: string;
  classId: string;
  gameId: string;
  addedAt: Date;
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
  private readonly props: ClassGameProps;

  private constructor(props: ClassGameProps) {
    this.props = props;
  }

  static create(props: CreateClassGameProps): ClassGame {
    return new ClassGame({
      id: props.id,
      classId: props.classId,
      gameId: props.gameId,
      addedAt: new Date(),
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

  toPersistence(): ClassGameProps {
    return { ...this.props };
  }
}
