import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import type { ImageStorage, UploadedImage } from '../../domain/ports/image-storage.port.js';

/**
 * Las imágenes viven en Cloudinary (CDN + object storage), no en Mongo ni en
 * disco local: guardar binarios en la base de datos infla los documentos,
 * ralentiza cada query del catálogo, y no escala en un entorno serverless
 * donde el disco no persiste entre despliegues.
 */
@Injectable()
export class CloudinaryImageStorage implements ImageStorage {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(buffer: Buffer, folder: string): Promise<UploadedImage> {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new ServiceUnavailableException(
        'El almacenamiento de imágenes no está configurado todavía.',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `nexusplay/${folder}`,
          resource_type: 'image',
          // Redimensiona en el borde: nadie sube una carta de juego para
          // mostrarla a 4000px, y esto acota el costo de banda por imagen.
          transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary no devolvió resultado.'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      uploadStream.end(buffer);
    });
  }

  async uploadAudio(buffer: Buffer, folder: string): Promise<UploadedImage> {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new ServiceUnavailableException(
        'El almacenamiento de imágenes no está configurado todavía.',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `nexusplay/${folder}`,
          // Cloudinary trata el audio bajo el tipo "video" (sin transformación de imagen).
          resource_type: 'video',
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary no devolvió resultado.'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      uploadStream.end(buffer);
    });
  }
}
