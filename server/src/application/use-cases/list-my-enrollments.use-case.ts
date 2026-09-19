import { Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { toClassDto, type ClassDto } from '../dtos/class-response.dto.js';

/** Clases donde el usuario autenticado está matriculado como estudiante (issue #101). */
@Injectable()
export class ListMyEnrollmentsUseCase {
  constructor(@Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository) {}

  async execute(requestingUserId: string): Promise<ClassDto[]> {
    const classes = await this.classRepository.findAllClassesEnrolledByUserId(requestingUserId);
    return classes.map(toClassDto);
  }
}
