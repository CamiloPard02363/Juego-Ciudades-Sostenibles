import { InvalidClassNameError } from '../errors/class.errors.js';

export interface ClassProps {
  id: string;
  name: string;
  description: string;
  teacherUserId: string;
  createdAt: Date;
}

export interface CreateClassProps {
  id: string;
  name: string;
  description?: string;
  teacherUserId: string;
}

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 80;

export class ClassEntity {
  private constructor(private readonly props: ClassProps) {}

  static create(props: CreateClassProps): ClassEntity {
    const name = props.name.trim();
    if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
      throw new InvalidClassNameError();
    }

    return new ClassEntity({
      id: props.id,
      name,
      description: props.description?.trim() ?? '',
      teacherUserId: props.teacherUserId,
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: ClassProps): ClassEntity {
    return new ClassEntity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string {
    return this.props.description;
  }
  get teacherUserId(): string {
    return this.props.teacherUserId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toPersistence(): ClassProps {
    return { ...this.props };
  }
}
