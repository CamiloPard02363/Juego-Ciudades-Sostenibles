import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import { toGameDetailDto, type GameDetailDto } from '../dtos/game-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { GameFactoryService, type BuildGameInput } from '../services/game-factory.service.js';

export type CreateGameInput = BuildGameInput;

/**
 * Cualquier usuario autenticado puede crear un juego (ver ADR en
 * homeworks/pendientes.md): no hay chequeo de rol aquí, a diferencia de
 * CreateUserUseCase. La moderación de contenido queda para el futuro
 * clasificador de ML mencionado por el usuario — mientras tanto los juegos
 * nacen en DRAFT y el creador decide cuándo publicarlos.
 *
 * Si se pasa `organizationId`, el juego nace institucional. El único requisito
 * es pertenecer a esa organización: no se exige orgRole ADMIN ni TEACHER, un
 * STUDENT del colegio también puede aportar material institucional.
 *
 * La construcción/validación de la entidad vive en `GameFactoryService`
 * (compartida con el pipeline de importación masiva — ver
 * `ImportGamesBatchUseCase`); este caso de uso solo orquesta ese paso más el
 * guardado de un único juego.
 */
@Injectable()
export class CreateGameUseCase implements UseCase<CreateGameInput, GameDetailDto> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly gameFactory: GameFactoryService,
  ) {}

  async execute(input: CreateGameInput): Promise<GameDetailDto> {
    const game = await this.gameFactory.build(input);
    await this.gameRepository.save(game);
    return toGameDetailDto(game);
  }
}
