export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

export interface UploadedImage {
  url: string;
  publicId: string;
}

export interface ImageStorage {
  /** Sube un buffer de imagen y devuelve su URL pública (CDN) y su id para poder borrarla luego. */
  upload(buffer: Buffer, folder: string): Promise<UploadedImage>;
}
