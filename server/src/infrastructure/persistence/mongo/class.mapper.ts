import { ClassEntity, type ClassProps } from '../../../domain/entities/class.entity.js';

export type ClassDocument = ClassProps & { _id: string };

export class ClassMapper {
  static toPersistence(classEntity: ClassEntity): ClassDocument {
    const props = classEntity.toPersistence();
    return { ...props, _id: props.id };
  }

  static toDomain(document: ClassDocument): ClassEntity {
    return ClassEntity.fromPersistence({
      id: document._id,
      name: document.name,
      description: document.description,
      teacherUserId: document.teacherUserId,
      createdAt: document.createdAt,
    });
  }
}
