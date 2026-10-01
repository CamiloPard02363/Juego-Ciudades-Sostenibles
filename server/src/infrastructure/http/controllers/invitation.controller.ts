import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { GetInvitationByTokenUseCase } from '../../../application/use-cases/get-invitation-by-token.use-case.js';
import { AcceptInvitationUseCase } from '../../../application/use-cases/accept-invitation.use-case.js';
import { AcceptInvitationDto } from '../dtos/accept-invitation.dto.js';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días, igual TTL que AuthController

/**
 * Rutas públicas de invitación (issue #232): sin `JwtAuthGuard` a propósito
 * — quien abre el link todavía no tiene cuenta. La autenticación real de la
 * operación es el token opaco de un solo uso en la URL, no una sesión.
 */
@Controller('invitations')
export class InvitationController {
  constructor(
    private readonly getInvitationByTokenUseCase: GetInvitationByTokenUseCase,
    private readonly acceptInvitationUseCase: AcceptInvitationUseCase,
  ) {}

  /** Precarga los datos nominales (nombre, email, destino) antes de completar el registro. */
  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.getInvitationByTokenUseCase.execute({ token });
  }

  /**
   * Completa el registro y deja al usuario autenticado de una vez (mismo
   * patrón de cookie httpOnly que `AuthController.login`), para que entre
   * directo al dashboard sin pasar por `/login` otra vez.
   */
  @Post(':token/accept')
  @HttpCode(HttpStatus.CREATED)
  async accept(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.acceptInvitationUseCase.execute({
      token,
      plainPassword: dto.plainPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      locale: dto.locale,
    });

    const crossSite = process.env.NODE_ENV === 'production';
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: crossSite,
      sameSite: crossSite ? 'none' : 'lax',
      path: '/auth',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });

    return { user, accessToken };
  }
}
