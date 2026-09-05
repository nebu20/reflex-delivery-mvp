/**
 * createApp.ts — Factory that creates an Express app bound to a given db instance.
 * Used by main app and tests to inject database instance.
 */
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import healthRouter from './routes/health';
import { createDeliveryRouter } from './modules/deliveries/delivery.routes';
import { RIDERS } from './modules/deliveries/delivery.types';

export function createApp(db: Database.Database) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', healthRouter);
  app.use('/api/deliveries', createDeliveryRouter(db));
  app.get('/api/riders', (_req, res) => {
    res.json(RIDERS);
  });
  return app;
}
