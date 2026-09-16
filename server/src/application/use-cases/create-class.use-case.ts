import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ClassEntity } from '../../domain/entities/class.entity.js';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { USER_REPOSITORY, type UserRepository } from '../../domain/ports/user.repository.port.js';
import { toClassDto, type ClassDto } from '../dtos/class-response.dto.js';

export interface CreateClassInput {
  teacherUserId: string;
  name: string;
  description?: string;
}

@Injectable()
export class CreateClassUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateClassInput): Promise<ClassDto> {
    await this.ensureTeacher(input.teacherUserId);
    const classEntity = ClassEntity.create({
      id: this.idGenerator.generate(),
      teacherUserId: input.teacherUserId,
      name: input.name,
      description: input.description,
    });
    await this.classRepository.save(classEntity);
    return toClassDto(classEntity);
  }

  private async ensureTeacher(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.role.getName() !== 'TEACHER') {
      throw new ForbiddenException('Solo un profesor puede administrar clases.');
    }
  }
}
