import type { IdentityProviderAccountModel } from '../../../generated/prisma/client.js';
import { IdentityProviderAccount } from '../../../domain/entities/identity-provider-account.entity.js';
import type { AuthProviderName } from '../../../domain/entities/identity-provider-account.entity.js';

export class IdentityProviderAccountMapper {
  static toDomain(record: IdentityProviderAccountModel): IdentityProviderAccount {
    return IdentityProviderAccount.fromPersistence({
      id: record.id,
      userId: record.userId,
      provider: record.provider as AuthProviderName,
      providerUserId: record.providerUserId,
      emailAtLinking: record.emailAtLinking,
      createdAt: record.createdAt,
    });
  }

  static toPersistence(account: IdentityProviderAccount) {
    const props = account.toPersistence();

    return {
      id: props.id,
      userId: props.userId,
      provider: props.provider,
      providerUserId: props.providerUserId,
      emailAtLinking: props.emailAtLinking,
    };
  }
}
