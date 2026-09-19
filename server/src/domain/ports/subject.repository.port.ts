import { Subject } from '../entities/subject.entity.js';

export const SUBJECT_REPOSITORY = Symbol('SUBJECT_REPOSITORY');

export interface SubjectRepository {
  save(subject: Subject): Promise<void>;
  findById(id: string): Promise<Subject | null>;
  findBySlug(slug: string): Promise<Subject | null>;
  existsBySlug(slug: string): Promise<boolean>;
  /** Todas las PUBLIC, más las PRIVATE cuyo dueño es `requestingUserId`. */
  findVisibleTo(requestingUserId: string): Promise<Subject[]>;
  /**
   * Query sin filtro de pertenencia — solo para ADMIN global de plataforma
   * (issue #101). Excluye soft-deleted: no hay auditoría histórica en
   * alcance, solo listado del catálogo vigente.
   */
  findAll(): Promise<Subject[]>;
  /** Hijas directas (`parentSubjectId = id`), en cualquier estado (PUBLIC o PRIVATE). */
  findByParentId(parentId: string): Promise<Subject[]>;
  /** Soft-delete: solo debe invocarse sobre una materia que pasó `canBeDeletedBy`. */
  softDelete(id: string): Promise<void>;
}
