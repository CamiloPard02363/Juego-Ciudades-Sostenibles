import { Inject, Injectable } from '@nestjs/common';
import { ClassEnrollment } from '../../domain/entities/class-enrollment.entity.js';
import { Invitation } from '../../domain/entities/invitation.entity.js';
import { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { PersonName } from '../../domain/value-objects/person-name.vo.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import {
  INVITATION_REPOSITORY,
  type InvitationRepository,
} from '../../domain/ports/invitation.repository.port.js';
import {
  OPAQUE_TOKEN_GENERATOR,
  type OpaqueTokenGenerator,
} from '../../domain/ports/opaque-token-generator.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import {
  ClassHasNoOrganizationError,
  ClassInactiveError,
  ClassNotFoundError,
} from '../errors/application.errors.js';
import type { EnrollOrInviteResultDto } from '../dtos/invitation-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { ClassAccessResolver } from '../services/class-access-resolver.service.js';
import { InvitationLinkBuilder } from '../services/invitation-link-builder.service.js';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface InviteStudentToClassInput {
  classId: string;
  requestingUserId: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Alta manual de un estudiante a una clase (issue #232). Requiere que la
 * clase tenga organización (mismo requisito que `EnrollStudentUseCase`,
 * CA-C2): una clase sin organización no tiene a dónde matricular en ambos
 * niveles. Tres caminos según el estado del email objetivo:
 * - Ya tiene cuenta y ya es miembro de la organización dueña: se crea
 *   directo el `ClassEnrollmentModel`, sin token (CA-C2 extendido).
 * - Ya tiene cuenta pero no es miembro de la organización: se vincula a la
 *   organización como STUDENT y se matricula en la clase, ambos sin token.
 * - No tiene cuenta: se genera invitación con token — al aceptarla, el
 *   usuario queda matriculado en la clase Y en la organización dueña, sin
 *   paso manual adicional.
 *
 * Autorización vía `ClassAccessResolver` (profesor dueño de esta Class,
 * admin de la institución dueña, o admin global).
 */
@Injectable()
export class InviteStudentToClassUseCase
  implements UseCase<InviteStudentToClassInput, EnrollOrInviteResultDto>
{
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepository: InvitationRepository,
    @Inject(OPAQUE_TOKEN_GENERATOR) private readonly opaqueTokenGenerator: OpaqueTokenGenerator,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    private readonly classAccessResolver: ClassAccessResolver,
    private readonly invitationLinkBuilder: InvitationLinkBuilder,
  ) {}

  async execute(input: InviteStudentToClassInput): Promise<EnrollOrInviteResultDto> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    if (!classEntity.organizationId) {
      throw new ClassHasNoOrganizationError(classEntity.id);
    }

    const canManage = await this.classAccessResolver.canManage(classEntity, input.requestingUserId);
    if (!canManage) {
      throw new ForbiddenActionError('invitar estudiantes a esta clase');
    }

    if (!classEntity.isActive) {
      throw new ClassInactiveError();
    }

    const organizationId = classEntity.organizationId;
    const email = Email.create(input.email);
    const name = PersonName.create(input.firstName, input.lastName);
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      const existingMembership = await this.organizationRepository.findMembership(
        organizationId,
        existingUser.id,
      );

      if (!existingMembership) {
        const membership = OrganizationMembership.create({
          organizationId,
          userId: existingUser.id,
          orgRole: OrganizationRole.student(),
        });
        await this.organizationRepository.createMembership(membership);
      }

      const existingEnrollment = await this.classRepository.findEnrollment(
        classEntity.id,
        existingUser.id,
      );
      if (!existingEnrollment) {
        const enrollment = ClassEnrollment.create({
          id: this.idGenerator.generate(),
          classId: classEntity.id,
          userId: existingUser.id,
        });
        await this.classRepository.enroll(enrollment);
      }

      return { status: 'LINKED', userId: existingUser.id };
    }

    const plainToken = this.opaqueTokenGenerator.generate();
    const invitation = Invitation.create({
      id: this.idGenerator.generate(),
      tokenHash: this.opaqueTokenGenerator.hash(plainToken),
      email: email.getValue(),
      firstName: name.firstName,
      lastName: name.lastName,
      organizationId,
      classId: classEntity.id,
      invitedByUserId: input.requestingUserId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    });

    await this.invitationRepository.save(invitation);

    return {
      status: 'PENDING',
      invitationUrl: this.invitationLinkBuilder.build(plainToken),
      expiresAt: invitation.expiresAt,
    };
  }
}
