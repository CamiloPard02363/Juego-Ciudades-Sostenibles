import 'dotenv/config';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { DomainExceptionFilter } from './infrastructure/http/filters/domain-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  // Sin límite explícito, Express deja pasar bodies grandes hasta agotar
  // memoria antes de que la validación de aplicación (ej. tope de 200
  // parejas en un juego) tenga oportunidad de rechazarlos.
  app.useBodyParser('json', { limit: '512kb' });

  // El cliente de Vite corre en otro origen y necesita CORS para el login.
  // El refresh token viaja en una cookie httpOnly: el navegador solo la
  // envía en peticiones cross-origin si el servidor declara credentials.
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
