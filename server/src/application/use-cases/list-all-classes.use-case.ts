import { Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { toClassDto, type ClassDto } from '../dtos/class-response.dto.js';

/**
 * Query sin filtro de pertenencia: devuelve TODAS las Class de la plataforma
 * (issue #101, punto 4). Solo listado — sin auditoría histórica de acciones,
 * eso queda fuera de alcance. La autorización de ADMIN global la aplica
 * `RolesGuard` (`@Roles('ADMIN')`) sobre el endpoint HTTP, no este use-case
 * (mismo patrón que `ListAllOrganizationsUseCase`).
 */
@Injectable()
export class ListAllClassesUseCase {
  constructor(@Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository) {}

  async execute(): Promise<ClassDto[]> {
    const classes = await this.classRepository.findAll();
    return classes.map(toClassDto);
  }
}
