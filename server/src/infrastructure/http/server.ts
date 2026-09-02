import express, { Express } from 'express';
import { healthRouter } from './routes/health.routes';

export function createServer(): Express {
  const app = express();

  app.use(express.json());
  app.use(healthRouter);

  return app;
}
