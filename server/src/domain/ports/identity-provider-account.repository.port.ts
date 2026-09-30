import type {
  AuthProviderName,
  IdentityProviderAccount,
} from '../entities/identity-provider-account.entity.js';

export const IDENTITY_PROVIDER_ACCOUNT_REPOSITORY = Symbol(
  'IDENTITY_PROVIDER_ACCOUNT_REPOSITORY',
);

export interface IdentityProviderAccountRepository {
  save(account: IdentityProviderAccount): Promise<void>;
  findByProviderAndProviderUserId(
    provider: AuthProviderName,
    providerUserId: string,
  ): Promise<IdentityProviderAccount | null>;
}
