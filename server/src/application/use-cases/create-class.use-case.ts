import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ClassEntity } from '../../domain/entities/class.entity.js';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import {
  INVITE_CODE_GENERATOR,
  type InviteCodeGenerator,
} from '../../domain/ports/invite-code-generator.port.js';
import { USER_REPOSITORY, type UserRepository } from '../../domain/ports/user.repository.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import type { User } from '../../domain/entities/user.entity.js';
import { toClassDto, type ClassDto } from '../dtos/class-response.dto.js';
import { TeacherPersonalOrganizationService } from '../services/teacher-personal-organization.service.js';

export interface CreateClassInput {
  teacherUserId: string;
  name: string;
  description?: string;
  /**
   * Organización a la que se asocia la clase (issue #106, CA1.1). El profesor
   * debe pertenecer a esa organización (cualquier `OrganizationRole`) o se
   * lanza 403. Si se omite, se mantiene el comportamiento previo: la clase se
   * asocia a la organización personal auto-creada del profesor.
   */
  organizationId?: string;
}

/**
 * Punto elegido para disparar la organización personal automática del
 * profesor (issue #101, punto 3): al crear su primera Class, no en el
 * registro. Es el punto arquitectónicamente más limpio porque `organizationId`
 * vive en `ClassModel` — asignar la organización justo antes de guardar la
 * clase evita un paso intermedio "regístrate y luego, en segundo plano, algo
 * te crea una organización que todavía no usas para nada".
 * `ensurePersonalOrganization` es idempotente: profesores con varias clases
 * reutilizan la misma organización personal.
 */
@Injectable()
export class CreateClassUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(INVITE_CODE_GENERATOR) private readonly inviteCodeGenerator: InviteCodeGenerator,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly teacherPersonalOrganization: TeacherPersonalOrganizationService,
  ) {}

  async execute(input: CreateClassInput): Promise<ClassDto> {
    const teacher = await this.ensureTeacher(input.teacherUserId);
    const organizationId = input.organizationId
      ? await this.resolveExplicitOrganization(input.organizationId, teacher.id)
      : await this.teacherPersonalOrganization.ensurePersonalOrganization(teacher);

    const classEntity = ClassEntity.create({
      id: this.idGenerator.generate(),
      teacherUserId: input.teacherUserId,
      name: input.name,
      description: input.description,
      organizationId,
      inviteCode: await this.generateUniqueInviteCode(),
    });
    await this.classRepository.save(classEntity);
    return toClassDto(classEntity);
  }

  /**
   * CA1.1: si el body trae `organizationId`, el profesor debe pertenecer a
   * esa organización (cualquier `OrganizationRole`); si no, 403. No exige
   * `OrganizationRole.ADMIN` — cualquier TEACHER miembro puede crear clases
   * asociadas a su organización.
   */
  private async resolveExplicitOrganization(
    organizationId: string,
    teacherUserId: string,
  ): Promise<string> {
    const membership = await this.organizationRepository.findMembership(
      organizationId,
      teacherUserId,
    );

    if (!membership) {
      throw new ForbiddenException('No pertenece a la organización indicada.');
    }

    return organizationId;
  }

  private async ensureTeacher(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.role.getName() !== 'TEACHER') {
      throw new ForbiddenException('Solo un profesor puede administrar clases.');
    }
    return user;
  }

  /**
   * El índice único de `classes.invite_code` es la garantía real ante una
   * colisión concurrente; este bucle solo evita el caso común (colisión de
   * un código de 6 caracteres es rarísima, pero no imposible).
   */
  private async generateUniqueInviteCode(): Promise<string> {
    let code = this.inviteCodeGenerator.generate();
    let existing = await this.classRepository.findByInviteCode(code);

    while (existing) {
      code = this.inviteCodeGenerator.generate();
      existing = await this.classRepository.findByInviteCode(code);
    }

    return code;
  }
}
