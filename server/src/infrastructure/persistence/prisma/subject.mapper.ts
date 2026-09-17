import type { SubjectModel } from '../../../generated/prisma/client.js';
import { Subject } from '../../../domain/entities/subject.entity.js';
import { SubjectStatus } from '../../../domain/value-objects/subject-status.vo.js';

export class SubjectMapper {
  static toDomain(record: SubjectModel): Subject {
    return Subject.fromPersistence({
      id: record.id,
      name: record.name,
      slug: record.slug,
      parentSubjectId: record.parentSubjectId,
      creatorUserId: record.creatorUserId,
      status: SubjectStatus.create(record.status),
      createdAt: record.createdAt,
    });
  }

  static toPersistence(subject: Subject) {
    const props = subject.toPersistence();

    return {
      id: props.id,
      name: props.name,
      slug: props.slug,
      parentSubjectId: props.parentSubjectId,
      creatorUserId: props.creatorUserId,
      status: props.status.getName(),
      createdAt: props.createdAt,
    };
  }
}
