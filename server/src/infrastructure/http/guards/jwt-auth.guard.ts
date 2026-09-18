import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/ports/user.repository.port.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado.');
    }

    let userId: string;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    // El JWT sigue siendo válido hasta que expira (hasta 15 min) aunque un
    // administrador desactive la cuenta mientras tanto; se revalida contra
    // la BD en cada request para que la desactivación surta efecto de
    // inmediato en vez de esperar a que el token venza.
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tu cuenta está inactiva por cuestiones de administración.');
    }

    request.userId = userId;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
