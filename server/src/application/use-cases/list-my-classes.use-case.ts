import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { USER_REPOSITORY, type UserRepository } from '../../domain/ports/user.repository.port.js';
import { toClassDto, type ClassDto } from '../dtos/class-response.dto.js';

@Injectable()
export class ListMyClassesUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(teacherUserId: string): Promise<ClassDto[]> {
    const user = await this.userRepository.findById(teacherUserId);
    if (!user || user.role.getName() !== 'TEACHER') {
      throw new ForbiddenException('Solo un profesor puede consultar sus clases.');
    }
    const classes = await this.classRepository.findAllByTeacherUserId(teacherUserId);
    return classes.map(toClassDto);
  }
}
