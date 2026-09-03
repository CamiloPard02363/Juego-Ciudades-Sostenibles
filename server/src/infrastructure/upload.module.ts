import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserModule } from './user.module.js';
import { IMAGE_STORAGE } from '../domain/ports/image-storage.port.js';
import { CloudinaryImageStorage } from './storage/cloudinary-image.storage.js';
import { UploadImageUseCase } from '../application/use-cases/upload-image.use-case.js';
import { UploadController } from './http/controllers/upload.controller.js';

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

@Module({
  imports: [
    UserModule,
    MulterModule.register({
      // El buffer va directo a Cloudinary desde memoria, sin tocar disco —
      // necesario también porque un entorno serverless no garantiza disco persistente.
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
    }),
  ],
  controllers: [UploadController],
  providers: [
    { provide: IMAGE_STORAGE, useClass: CloudinaryImageStorage },
    UploadImageUseCase,
  ],
})
export class UploadModule {}
