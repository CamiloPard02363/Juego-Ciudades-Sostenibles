import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserRepository } from '../../domain/ports/user.repository.port.js'
import type { IdentityProviderAccountRepository } from '../../domain/ports/identity-provider-account.repository.port.js'
import type { IdGenerator } from '../../domain/ports/id-generator.port.js'
import { User } from '../../domain/entities/user.entity.js'
import { IdentityProviderAccount } from '../../domain/entities/identity-provider-account.entity.js'
import { Email } from '../../domain/value-objects/email.vo.js'
import { Password } from '../../domain/value-objects/password.vo.js'
import { PersonName } from '../../domain/value-objects/person-name.vo.js'
import { Role } from '../../domain/value-objects/role.vo.js'
import {
  GoogleAccountEmailConflictError,
  InvalidGoogleTokenError,
} from '../errors/application.errors.js'
import { TokenPairIssuer } from '../services/token-pair-issuer.service.js'
import { OrganizationAutoJoinService } from '../services/organization-auto-join.service.js'
import { LoginWithGoogleUseCase } from './login-with-google.use-case.js'

const verifyIdTokenMock = vi.fn()

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken(...args: unknown[]) {
      return verifyIdTokenMock(...args)
    }
  },
}))

function localUser() {
  return User.fromPersistence({
    id: 'user-1',
    email: Email.create('ana@colegio.edu.co'),
    password: Password.fromHash('hash-existente'),
    name: PersonName.create('Ana', 'Pérez'),
    role: Role.student(),
    displayName: 'Ana',
    avatarUrl: null,
    birthDate: null,
    locale: 'es-CO',
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    lastUpdate: new Date(),
  })
}

function googleOnlyUser() {
  return User.fromPersistence({
    id: 'user-google-1',
    email: Email.create('carla@gmail.com'),
    password: Password.none(),
    name: PersonName.create('Carla', 'Gómez'),
    role: Role.student(),
    displayName: 'Carla',
    avatarUrl: null,
    birthDate: null,
    locale: 'es-CO',
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    lastUpdate: new Date(),
  })
}

function setup(options: {
  userByEmail?: User | null
  userById?: User | null
  existingAccount?: IdentityProviderAccount | null
}) {
  const userRepository: UserRepository = {
    save: vi.fn(),
    findById: vi.fn(async () => options.userById ?? null),
    findByIds: vi.fn(),
    findByEmail: vi.fn(async () => options.userByEmail ?? null),
    existsByEmail: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
  }

  const identityProviderAccountRepository: IdentityProviderAccountRepository = {
    save: vi.fn(),
    findByProviderAndProviderUserId: vi.fn(async () => options.existingAccount ?? null),
  }

  const idGenerator: IdGenerator = { generate: vi.fn(() => 'generated-id') }

  const tokenPairIssuer = {
    issueFor: vi.fn(async () => ({ accessToken: 'access', refreshToken: 'refresh' })),
  } as unknown as TokenPairIssuer

  const organizationAutoJoin = {
    joinByEmailDomain: vi.fn(async () => undefined),
  } as unknown as OrganizationAutoJoinService

  const useCase = new LoginWithGoogleUseCase(
    userRepository,
    identityProviderAccountRepository,
    idGenerator,
    tokenPairIssuer,
    organizationAutoJoin,
  )

  return { useCase, userRepository, identityProviderAccountRepository, tokenPairIssuer }
}

function mockGooglePayload(payload: Record<string, unknown> | null) {
  verifyIdTokenMock.mockResolvedValue({ getPayload: () => payload })
}

describe('LoginWithGoogleUseCase', () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset()
  })

  it('idToken inválido/manipulado se rechaza con InvalidGoogleTokenError, sin crear usuario', async () => {
    verifyIdTokenMock.mockRejectedValue(new Error('invalid signature'))
    const { useCase, userRepository } = setup({})

    await expect(useCase.execute({ idToken: 'bad-token' })).rejects.toThrow(
      InvalidGoogleTokenError,
    )
    expect(userRepository.save).not.toHaveBeenCalled()
  })

  it('payload sin sub/email también se rechaza con InvalidGoogleTokenError', async () => {
    mockGooglePayload({ email: 'sin-sub@gmail.com' })
    const { useCase } = setup({})

    await expect(useCase.execute({ idToken: 'token' })).rejects.toThrow(InvalidGoogleTokenError)
  })

  it('login recurrente: reutiliza la identidad existente, no crea nada nuevo', async () => {
    const existingAccount = IdentityProviderAccount.fromPersistence({
      id: 'ipa-1',
      userId: 'user-google-1',
      provider: 'GOOGLE',
      providerUserId: 'google-sub-1',
      emailAtLinking: 'carla@gmail.com',
      createdAt: new Date(),
    })
    mockGooglePayload({
      sub: 'google-sub-1',
      email: 'carla@gmail.com',
      given_name: 'Carla',
      family_name: 'Gómez',
    })
    const { useCase, userRepository, identityProviderAccountRepository } = setup({
      existingAccount,
      userById: googleOnlyUser(),
    })

    const result = await useCase.execute({ idToken: 'token' })

    expect(identityProviderAccountRepository.save).not.toHaveBeenCalled()
    expect(userRepository.save).toHaveBeenCalledTimes(1)
    expect(result.accessToken).toBe('access')
  })

  it('email de Google coincide con cuenta local existente → GoogleAccountEmailConflictError, no crea nada', async () => {
    mockGooglePayload({
      sub: 'google-sub-2',
      email: 'ana@colegio.edu.co',
      given_name: 'Ana',
      family_name: 'Pérez',
    })
    const { useCase, userRepository, identityProviderAccountRepository } = setup({
      userByEmail: localUser(),
    })

    await expect(useCase.execute({ idToken: 'token' })).rejects.toThrow(
      GoogleAccountEmailConflictError,
    )
    expect(userRepository.save).not.toHaveBeenCalled()
    expect(identityProviderAccountRepository.save).not.toHaveBeenCalled()
  })

  it('registro nuevo por Google: crea User con Password.none() y la identidad vinculada', async () => {
    mockGooglePayload({
      sub: 'google-sub-3',
      email: 'nueva@gmail.com',
      given_name: 'Nueva',
      family_name: 'Persona',
      picture: 'https://example.com/avatar.png',
    })
    const { useCase, userRepository, identityProviderAccountRepository } = setup({
      userByEmail: null,
    })

    const result = await useCase.execute({ idToken: 'token' })

    expect(userRepository.save).toHaveBeenCalledTimes(2) // create + registerLogin
    const savedUser = (userRepository.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as User
    expect(savedUser.password.hasPassword()).toBe(false)
    expect(savedUser.isEmailVerified).toBe(true)

    expect(identityProviderAccountRepository.save).toHaveBeenCalledTimes(1)
    const savedAccount = (identityProviderAccountRepository.save as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as IdentityProviderAccount
    expect(savedAccount.provider).toBe('GOOGLE')
    expect(savedAccount.providerUserId).toBe('google-sub-3')

    expect(result.accessToken).toBe('access')
  })
})
