import type { ClassModel } from '../../../generated/prisma/client.js';
import { ClassEntity } from '../../../domain/entities/class.entity.js';

export class ClassMapper {
  static toDomain(record: ClassModel): ClassEntity {
    return ClassEntity.fromPersistence({
      id: record.id,
      name: record.name,
      description: record.description,
      teacherUserId: record.teacherUserId,
      createdAt: record.createdAt,
    });
  }

  static toPersistence(classEntity: ClassEntity) {
    const props = classEntity.toPersistence();

    return {
      id: props.id,
      name: props.name,
      description: props.description,
      teacherUserId: props.teacherUserId,
      createdAt: props.createdAt,
    };
  }
}
