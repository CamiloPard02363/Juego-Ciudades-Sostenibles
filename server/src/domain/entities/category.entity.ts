import { InvalidCategoryNameError } from '../errors/category.errors.js';

export interface CategoryProps {
  id: string;
  name: string;
  slug: string;
  creatorUserId: string | null;
  createdAt: Date;
}

export interface CreateCategoryProps {
  id: string;
  name: string;
  slug: string;
  creatorUserId: string;
}

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 60;

/**
 * A diferencia de `GameType` (un enum cerrado a nivel de código: agregar un
 * tipo de juego es un cambio de mecánica deliberado), `Category` es una
 * entidad de datos: cualquier usuario autenticado puede crear una nueva
 * materia/tema al vuelo (ver homeworks/pendientes.md) — no hay una lista
 * fija de categorías válidas.
 */
export class Category {
  private props: CategoryProps;

  private constructor(props: CategoryProps) {
    this.props = props;
  }

  static create(props: CreateCategoryProps): Category {
    const name = props.name.trim();
    if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
      throw new InvalidCategoryNameError(
        `debe tener entre ${NAME_MIN_LENGTH} y ${NAME_MAX_LENGTH} caracteres.`,
      );
    }

    return new Category({
      id: props.id,
      name,
      slug: props.slug,
      creatorUserId: props.creatorUserId,
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: CategoryProps): Category {
    return new Category(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get creatorUserId(): string | null {
    return this.props.creatorUserId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Categorías sin dueño registrado (creadas antes de rastrear autoría) solo las gestiona un admin. */
  canBeManagedBy(requestingUserId: string, isAdmin: boolean): boolean {
    return isAdmin || this.props.creatorUserId === requestingUserId;
  }

  toPersistence(): CategoryProps {
    return { ...this.props };
  }
}
