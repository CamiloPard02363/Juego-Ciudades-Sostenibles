import { Inject, Injectable } from '@nestjs/common';
import { IMAGE_STORAGE, type ImageStorage } from '../../domain/ports/image-storage.port.js';
import { InvalidImageError } from '../errors/application.errors.js';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export interface UploadImageInput {
  buffer: Buffer;
  mimeType: string;
  size: number;
  /** Subcarpeta lógica en el storage, ej. "game-covers" o "memory-cards". */
  folder: string;
}

export interface UploadImageOutput {
  url: string;
}

@Injectable()
export class UploadImageUseCase {
  constructor(@Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage) {}

  async execute(input: UploadImageInput): Promise<UploadImageOutput> {
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new InvalidImageError('Solo se permiten imágenes PNG, JPEG, WEBP o GIF.');
    }
    if (input.size > MAX_SIZE_BYTES) {
      throw new InvalidImageError('La imagen no puede pesar más de 5 MB.');
    }

    const uploaded = await this.imageStorage.upload(input.buffer, input.folder);
    return { url: uploaded.url };
  }
}
