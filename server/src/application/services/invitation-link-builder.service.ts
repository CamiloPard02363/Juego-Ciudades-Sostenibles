import { Injectable } from '@nestjs/common';

/**
 * Construye la URL pública del link de invitación (issue #232, MVP sin envío
 * de email real) — el admin/profesor copia y distribuye este link a mano.
 * Usa el primer dominio de `CORS_ORIGIN` (mismo criterio que `main.ts` para
 * resolver el origen del frontend), con el mismo fallback a desarrollo local.
 */
@Injectable()
export class InvitationLinkBuilder {
  build(plainToken: string): string {
    const frontendOrigin = process.env.CORS_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:5173';
    return `${frontendOrigin}/invitaciones/${plainToken}`;
  }
}
