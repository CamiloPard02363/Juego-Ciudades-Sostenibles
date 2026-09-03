import { Inject, Injectable } from '@nestjs/common';
import { IMAGE_STORAGE, type ImageStorage } from '../../domain/ports/image-storage.port.js';
import { InvalidImageError } from '../errors/application.errors.js';

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']);

export interface UploadAudioInput {
  buffer: Buffer;
  mimeType: string;
  size: number;
  folder: string;
}

export interface UploadAudioOutput {
  url: string;
}

@Injectable()
export class UploadAudioUseCase {
  constructor(@Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage) {}

  async execute(input: UploadAudioInput): Promise<UploadAudioOutput> {
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new InvalidImageError('Solo se permiten audios MP3, WAV, OGG o WEBM.');
    }
    if (input.size > MAX_SIZE_BYTES) {
      throw new InvalidImageError('El audio no puede pesar más de 8 MB.');
    }

    const uploaded = await this.imageStorage.uploadAudio(input.buffer, input.folder);
    return { url: uploaded.url };
  }
}
