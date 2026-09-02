import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { OpaqueTokenGenerator } from '../../domain/ports/opaque-token-generator.port.js';

@Injectable()
export class CryptoOpaqueTokenGenerator implements OpaqueTokenGenerator {
  generate(): string {
    return randomBytes(48).toString('base64url');
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
