import { Subject } from '../../domain/entities/subject.entity.js';

export interface SubjectDto {
  id: string;
  name: string;
  slug: string;
  parentSubjectId: string | null;
  creatorUserId: string | null;
  status: string;
  createdAt: Date;
}

export interface SubjectWithGameCountDto extends SubjectDto {
  gameCount: number;
}

export function toSubjectDto(subject: Subject): SubjectDto {
  return {
    id: subject.id,
    name: subject.name,
    slug: subject.slug,
    parentSubjectId: subject.parentSubjectId,
    creatorUserId: subject.creatorUserId,
    status: subject.status.getName(),
    createdAt: subject.createdAt,
  };
}
