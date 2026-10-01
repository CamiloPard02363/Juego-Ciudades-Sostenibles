import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity.js';
import { ClassEnrollment } from '../../domain/entities/class-enrollment.entity.js';
import { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { Password } from '../../domain/value-objects/password.vo.js';
import { PersonName } from '../../domain/value-objects/person-name.vo.js';
import { Role } from '../../domain/value-objects/role.vo.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import {
  INVITATION_REPOSITORY,
  type InvitationRepository,
} from '../../domain/ports/invitation.repository.port.js';
import {
  OPAQUE_TOKEN_GENERATOR,
  type OpaqueTokenGenerator,
} from '../../domain/ports/opaque-token-generator.port.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/ports/password-hasher.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import {
  EmailAlreadyRegisteredError,
  InvitationAlreadyAcceptedError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from '../errors/application.errors.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { TokenPairIssuer, type TokenPair } from '../services/token-pair-issuer.service.js';

export interface AcceptInvitationInput {
  token: string;
  plainPassword: string;
  /**
   * El estudiante puede ajustar su nombre al completar el registro; si se
   * omite, se usa el nombre que el admin/profesor ingresó al invitar.
   */
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthDate?: Date;
  locale?: string;
}

export interface AcceptInvitationOutput extends TokenPair {
  user: UserResponseDto;
}

/**
 * `POST /invitations/:token/accept` (issue #232): completa el registro del
 * estudiante invitado — crea la cuenta con la contraseña que define, consume
 * el token (un solo uso) y lo matricula automáticamente en la organización
 * (y la clase, si la invitación era a una clase específica), sin auto-join
 * por dominio (a diferencia de `RegisterUserUseCase`, el destino ya lo fija
 * la invitación, no el dominio del correo).
 */
@Injectable()
export class AcceptInvitationUseCase
  implements UseCase<AcceptInvitationInput, AcceptInvitationOutput>
{
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepository: InvitationRepository,
    @Inject(OPAQUE_TOKEN_GENERATOR) private readonly opaqueTokenGenerator: OpaqueTokenGenerator,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    private readonly tokenPairIssuer: TokenPairIssuer,
  ) {}

  async execute(input: AcceptInvitationInput): Promise<AcceptInvitationOutput> {
    const tokenHash = this.opaqueTokenGenerator.hash(input.token);
    const invitation = await this.invitationRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new InvitationNotFoundError();
    }
    if (invitation.isAccepted()) {
      throw new InvitationAlreadyAcceptedError();
    }
    if (invitation.isExpired()) {
      throw new InvitationExpiredError();
    }

    const email = Email.create(invitation.email);
    const alreadyExists = await this.userRepository.existsByEmail(email);
    if (alreadyExists) {
      // Carrera: el email se registró por otra vía entre que se generó el
      // link y se intentó aceptar. No hay forma segura de "fusionar" cuentas
      // acá — el estudiante debe iniciar sesión normal y pedirle al
      // admin/profesor que lo agregue manualmente (AddOrganizationMemberUseCase).
      throw new EmailAlreadyRegisteredError(email.getValue());
    }

    Password.assertIsStrong(input.plainPassword);
    const hashedValue = await this.passwordHasher.hash(input.plainPassword);
    const password = Password.fromHash(hashedValue);

    const name = PersonName.create(
      input.firstName?.trim() || invitation.firstName,
      input.lastName?.trim() || invitation.lastName,
      input.middleName,
    );

    const user = User.create({
      id: this.idGenerator.generate(),
      email,
      password,
      name,
      role: Role.student(),
      birthDate: input.birthDate ?? null,
      locale: input.locale,
    });

    await this.userRepository.save(user);

    const existingMembership = await this.organizationRepository.findMembership(
      invitation.organizationId,
      user.id,
    );
    if (!existingMembership) {
      const membership = OrganizationMembership.create({
        organizationId: invitation.organizationId,
        userId: user.id,
        orgRole: OrganizationRole.student(),
      });
      await this.organizationRepository.createMembership(membership);
    }

    if (invitation.classId) {
      const existingEnrollment = await this.classRepository.findEnrollment(
        invitation.classId,
        user.id,
      );
      if (!existingEnrollment) {
        const enrollment = ClassEnrollment.create({
          id: this.idGenerator.generate(),
          classId: invitation.classId,
          userId: user.id,
        });
        await this.classRepository.enroll(enrollment);
      }
    }

    invitation.accept();
    await this.invitationRepository.save(invitation);

    const tokenPair = await this.tokenPairIssuer.issueFor(user);

    return {
      ...tokenPair,
      user: toUserResponseDto(user),
    };
  }
}
