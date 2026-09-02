import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { USER_REPOSITORY } from '../domain/ports/user.repository.port.js';
import { PASSWORD_HASHER } from '../domain/ports/password-hasher.port.js';
import { ID_GENERATOR } from '../domain/ports/id-generator.port.js';
import { TOKEN_GENERATOR } from '../domain/ports/token-generator.port.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { PrismaUserRepository } from './persistence/prisma/prisma-user.repository.js';
import { BcryptPasswordHasher } from './security/bcrypt-password-hasher.adapter.js';
import { CryptoIdGenerator } from './security/crypto-id-generator.adapter.js';
import { JwtTokenGenerator } from './security/jwt-token-generator.adapter.js';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case.js';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case.js';
import { UpdateUserProfileUseCase } from '../application/use-cases/update-user-profile.use-case.js';
import { ChangeUserPasswordUseCase } from '../application/use-cases/change-user-password.use-case.js';
import { GetUserByIdUseCase } from '../application/use-cases/get-user-by-id.use-case.js';
import { DeactivateUserUseCase } from '../application/use-cases/deactivate-user.use-case.js';
import { ReactivateUserUseCase } from '../application/use-cases/reactivate-user.use-case.js';
import { VerifyUserEmailUseCase } from '../application/use-cases/verify-user-email.use-case.js';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case.js';
import { ChangeUserRoleUseCase } from '../application/use-cases/change-user-role.use-case.js';
import { UserController } from './http/controllers/user.controller.js';
import { AuthController } from './http/controllers/auth.controller.js';

@Module({
  imports: [
    JwtModule.register({
      global: false,
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    }),
  ],
  controllers: [UserController, AuthController],
  providers: [
    PrismaService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: ID_GENERATOR, useClass: CryptoIdGenerator },
    { provide: TOKEN_GENERATOR, useClass: JwtTokenGenerator },
    RegisterUserUseCase,
    CreateUserUseCase,
    LoginUserUseCase,
    UpdateUserProfileUseCase,
    ChangeUserPasswordUseCase,
    GetUserByIdUseCase,
    DeactivateUserUseCase,
    ReactivateUserUseCase,
    VerifyUserEmailUseCase,
    ListUsersUseCase,
    ChangeUserRoleUseCase,
  ],
})
export class UserModule {}
