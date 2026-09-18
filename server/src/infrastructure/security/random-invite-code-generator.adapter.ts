import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { InviteCodeGenerator } from '../../domain/ports/invite-code-generator.port.js';

// Mismo alfabeto que `generateRoomCode` en rooms.gateway.ts: sin caracteres
// ambiguos (0/O, 1/I/L) para que un código leído/dictado en voz alta no se
// preste a confusión.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

@Injectable()
export class RandomInviteCodeGenerator implements InviteCodeGenerator {
  generate(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += ALPHABET[randomInt(ALPHABET.length)];
    }
    return code;
  }
}
