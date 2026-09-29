import { Injectable } from '@nestjs/common';
import type {
  AuthProviderName,
  IdentityProviderAccount,
} from '../../../domain/entities/identity-provider-account.entity.js';
import type { IdentityProviderAccountRepository } from '../../../domain/ports/identity-provider-account.repository.port.js';
import { PrismaService } from './prisma.service.js';
import { IdentityProviderAccountMapper } from './identity-provider-account.mapper.js';

@Injectable()
export class PrismaIdentityProviderAccountRepository
  implements IdentityProviderAccountRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async save(account: IdentityProviderAccount): Promise<void> {
    const data = IdentityProviderAccountMapper.toPersistence(account);

    await this.prisma.identityProviderAccountModel.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findByProviderAndProviderUserId(
    provider: AuthProviderName,
    providerUserId: string,
  ): Promise<IdentityProviderAccount | null> {
    const record = await this.prisma.identityProviderAccountModel.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
    });
    return record ? IdentityProviderAccountMapper.toDomain(record) : null;
  }
}
