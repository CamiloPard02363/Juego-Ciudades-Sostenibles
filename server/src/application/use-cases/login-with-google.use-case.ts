import { Inject, Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../../domain/entities/user.entity.js';
import { IdentityProviderAccount } from '../../domain/entities/identity-provider-account.entity.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { Password } from '../../domain/value-objects/password.vo.js';
import { PersonName } from '../../domain/value-objects/person-name.vo.js';
import { Role } from '../../domain/value-objects/role.vo.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import {
  IDENTITY_PROVIDER_ACCOUNT_REPOSITORY,
  type IdentityProviderAccountRepository,
} from '../../domain/ports/identity-provider-account.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import {
  GoogleAccountEmailConflictError,
  InvalidGoogleTokenError,
  UserInactiveError,
} from '../errors/application.errors.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { TokenPairIssuer } from '../services/token-pair-issuer.service.js';
import { OrganizationAutoJoinService } from '../services/organization-auto-join.service.js';

export interface LoginWithGoogleInput {
  idToken: string;
}

export interface LoginWithGoogleOutput {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
}

interface GoogleIdentity {
  providerUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

/**
 * Login/registro federado con Google (issue #197). No usa el flujo de
 * redirect Authorization Code: el cliente ya obtuvo un idToken vía Google
 * Identity Services y este caso de uso solo lo verifica contra el Client ID
 * de GCP antes de resolver/crear el `User`.
 */
@Injectable()
export class LoginWithGoogleUseCase
  implements UseCase<LoginWithGoogleInput, LoginWithGoogleOutput>
{
  private readonly googleClient: OAuth2Client;

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(IDENTITY_PROVIDER_ACCOUNT_REPOSITORY)
    private readonly identityProviderAccountRepository: IdentityProviderAccountRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    private readonly tokenPairIssuer: TokenPairIssuer,
    private readonly organizationAutoJoin: OrganizationAutoJoinService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async execute(input: LoginWithGoogleInput): Promise<LoginWithGoogleOutput> {
    const identity = await this.verifyIdToken(input.idToken);

    const existingAccount =
      await this.identityProviderAccountRepository.findByProviderAndProviderUserId(
        'GOOGLE',
        identity.providerUserId,
      );

    const user = existingAccount
      ? await this.resolveExistingUser(existingAccount.userId)
      : await this.resolveOrCreateUserForNewIdentity(identity);

    if (!user.isActive) {
      throw new UserInactiveError();
    }

    user.registerLogin();
    await this.userRepository.save(user);

    await this.organizationAutoJoin.joinByEmailDomain(user.id, user.email);

    const { accessToken, refreshToken } = await this.tokenPairIssuer.issueFor(user);

    return { user: toUserResponseDto(user), accessToken, refreshToken };
  }

  private async resolveExistingUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      // La cuenta de Google apunta a un usuario que ya no existe (borrado
      // manual o self-service): no hay nada razonable que hacer salvo
      // tratarlo igual que un token inválido, sin filtrar detalles internos.
      throw new InvalidGoogleTokenError();
    }
    return user;
  }

  private async resolveOrCreateUserForNewIdentity(identity: GoogleIdentity): Promise<User> {
    const email = Email.create(identity.email);
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      // Regla de negocio confirmada (issue #197): no se auto-vincula. Quien
      // ya tiene cuenta local con este email debe entrar con su contraseña;
      // vincular Google después es un flujo separado desde el perfil.
      throw new GoogleAccountEmailConflictError(email.getValue());
    }

    const name = PersonName.create(identity.firstName, identity.lastName);
    const newUser = User.create({
      id: this.idGenerator.generate(),
      email,
      password: Password.none(),
      name,
      role: Role.student(),
      avatarUrl: identity.avatarUrl,
    });
    newUser.verifyEmail(); // Google ya verificó el correo del titular.

    await this.userRepository.save(newUser);

    const account = IdentityProviderAccount.create({
      id: this.idGenerator.generate(),
      userId: newUser.id,
      provider: 'GOOGLE',
      providerUserId: identity.providerUserId,
      emailAtLinking: email.getValue(),
    });
    await this.identityProviderAccountRepository.save(account);

    return newUser;
  }

  private async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email) {
        throw new InvalidGoogleTokenError();
      }

      return {
        providerUserId: payload.sub,
        email: payload.email,
        firstName: payload.given_name ?? payload.name ?? 'Usuario',
        // family_name puede venir ausente en cuentas de Google sin apellido
        // registrado; PersonName exige lastName no vacío, así que se cubre
        // con un valor neutro en vez de fallar el login por un dato opcional.
        lastName: payload.family_name ?? '-',
        avatarUrl: payload.picture ?? null,
      };
    } catch (error) {
      if (error instanceof InvalidGoogleTokenError) {
        throw error;
      }
      throw new InvalidGoogleTokenError();
    }
  }
}
