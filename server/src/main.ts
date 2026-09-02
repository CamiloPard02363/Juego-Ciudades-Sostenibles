import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // El cliente de Vite corre en otro origen y necesita CORS para el login.
  app.enableCors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
  });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
