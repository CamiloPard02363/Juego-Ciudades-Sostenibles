import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../../application/use-cases/register-user.use-case.js';
import { LoginUserUseCase } from '../../../application/use-cases/login-user.use-case.js';
import { RefreshAccessTokenUseCase } from '../../../application/use-cases/refresh-access-token.use-case.js';
import { LogoutUseCase } from '../../../application/use-cases/logout.use-case.js';
import { RegisterUserDto } from '../dtos/register-user.dto.js';
import { LoginUserDto } from '../dtos/login-user.dto.js';
import { InvalidCredentialsError } from '../../../application/errors/application.errors.js';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días, igual al TTL del token

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshAccessTokenUseCase: RefreshAccessTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterUserDto) {
    return this.registerUserUseCase.execute({
      ...dto,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginUserDto, @Res({ passthrough: true }) response: Response) {
    const { user, accessToken, refreshToken } = await this.loginUserUseCase.execute(dto);
    this.setRefreshTokenCookie(response, refreshToken);
    return { user, accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.extractRefreshTokenCookie(request);
    if (!refreshToken) {
      throw new InvalidCredentialsError();
    }

    const result = await this.refreshAccessTokenUseCase.execute({ refreshToken });
    this.setRefreshTokenCookie(response, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.extractRefreshTokenCookie(request);
    if (refreshToken) {
      await this.logoutUseCase.execute({ refreshToken });
    }
    response.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/auth' });
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string): void {
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
  }

  private extractRefreshTokenCookie(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[REFRESH_TOKEN_COOKIE];
  }
}
