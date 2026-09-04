import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { UploadImageUseCase } from '../../../application/use-cases/upload-image.use-case.js';
import { UploadAudioUseCase } from '../../../application/use-cases/upload-audio.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';

const ALLOWED_FOLDERS = new Set(['game-covers', 'memory-cards', 'guess-who-cards']);
const ALLOWED_AUDIO_FOLDERS = new Set(['guess-who-audio']);

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    private readonly uploadImageUseCase: UploadImageUseCase,
    private readonly uploadAudioUseCase: UploadAudioUseCase,
  ) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('folder') folder = 'game-covers',
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }
    if (!ALLOWED_FOLDERS.has(folder)) {
      throw new BadRequestException('Carpeta de destino no válida.');
    }

    return this.uploadImageUseCase.execute({
      buffer: file.buffer,
      mimeType: file.mimetype,
      size: file.size,
      folder,
    });
  }

  @Post('audio')
  @UseInterceptors(FileInterceptor('file'))
  uploadAudio(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('folder') folder = 'guess-who-audio',
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }
    if (!ALLOWED_AUDIO_FOLDERS.has(folder)) {
      throw new BadRequestException('Carpeta de destino no válida.');
    }

    return this.uploadAudioUseCase.execute({
      buffer: file.buffer,
      mimeType: file.mimetype,
      size: file.size,
      folder,
    });
  }
}
