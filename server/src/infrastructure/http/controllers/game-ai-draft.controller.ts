import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { GenerateGameDraftUseCase } from '../../../application/use-cases/generate-game-draft.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { GenerateGameDraftDto } from '../dtos/generate-game-draft.dto.js';

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]);

function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType) || mimeType.startsWith('image/');
}

/**
 * Asistente de IA que arma un borrador de juego a partir de archivos que
 * sube el profesor — nunca de un link. Vive separado de `GameController`
 * porque no es una operación CRUD sobre `Game` (no guarda nada), sino un
 * caso de uso de un solo paso.
 */
@Controller('games/ai-draft')
@UseGuards(JwtAuthGuard)
export class GameAiDraftController {
  constructor(private readonly generateGameDraftUseCase: GenerateGameDraftUseCase) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES },
      fileFilter: (_req, file, callback) => {
        callback(null, isAllowedMimeType(file.mimetype));
      },
    }),
  )
  async generate(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body() dto: GenerateGameDraftDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Sube al menos un archivo compatible (PDF, Word, Excel, CSV o imagen).',
      );
    }

    return this.generateGameDraftUseCase.execute({
      gameType: dto.gameType,
      files: files.map((file) => ({
        buffer: file.buffer,
        mimeType: file.mimetype,
        filename: file.originalname,
      })),
    });
  }
}
