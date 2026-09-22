import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { USER_REPOSITORY, type UserRepository } from '../../domain/ports/user.repository.port.js';
import { toClassDto, type ClassDto } from '../dtos/class-response.dto.js';
import { resolveOrganizationNamesByClass } from './shared/resolve-organization-names.js';

@Injectable()
export class ListMyClassesUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  /**
   * `includeInactive` (issue #133, CA-E4): por default solo trae clases
   * activas; el profesor puede pedir también las desactivadas explícitamente.
   */
  async execute(teacherUserId: string, includeInactive = false): Promise<ClassDto[]> {
    const user = await this.userRepository.findById(teacherUserId);
    if (!user || user.role.getName() !== 'TEACHER') {
      throw new ForbiddenException('Solo un profesor puede consultar sus clases.');
    }
    const classes = await this.classRepository.findAllByTeacherUserId(
      teacherUserId,
      includeInactive,
    );
    const namesByOrgId = await resolveOrganizationNamesByClass(
      classes,
      this.organizationRepository,
    );
    return classes.map((classEntity) =>
      toClassDto(classEntity, namesByOrgId.get(classEntity.organizationId ?? '') ?? null),
    );
  }
}
