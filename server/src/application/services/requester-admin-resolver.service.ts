import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';

/**
 * El JWT trae `role`, pero confiar en él para autorización permitiría que un
 * usuario recién degradado de ADMIN a STUDENT siguiera actuando como admin
 * hasta que su access token expire (hasta 15 min). Igual que el resto de
 * casos de uso de usuario, se resuelve el rol actual contra la base de datos
 * en cada operación sensible — este servicio solo evita repetir ese
 * find+isAdmin en cada caso de uso de Game.
 */
@Injectable()
export class RequesterAdminResolver {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async resolve(requestingUserId: string): Promise<boolean> {
    const user = await this.userRepository.findById(requestingUserId);
    return user?.isAdmin() ?? false;
  }
}
