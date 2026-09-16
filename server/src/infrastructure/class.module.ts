import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { CLASS_REPOSITORY } from '../domain/ports/class.repository.port.js';
import { MongoService } from './persistence/mongo/mongo.service.js';
import { MongoClassRepository } from './persistence/mongo/mongo-class.repository.js';
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case.js';
import { ListMyClassesUseCase } from '../application/use-cases/list-my-classes.use-case.js';
import { ClassController } from './http/controllers/class.controller.js';

@Module({
  imports: [UserModule],
  controllers: [ClassController],
  providers: [
    MongoService,
    { provide: CLASS_REPOSITORY, useClass: MongoClassRepository },
    CreateClassUseCase,
    ListMyClassesUseCase,
  ],
})
export class ClassModule {}
