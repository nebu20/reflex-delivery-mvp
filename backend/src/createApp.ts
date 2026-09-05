/**
 * createApp.ts — Factory that creates an Express app bound to a given db instance.
 * Used by main app and tests to inject database instance.
 */
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import healthRouter from './routes/health';
import { createDeliveryRouter } from './modules/deliveries/delivery.routes';
import { DeliveryRepository } from './modules/deliveries/delivery.repository';
import { DeliveryService } from './modules/deliveries/delivery.service';
import { DeliveryController } from './modules/deliveries/delivery.controller';

export function createApp(db: Database.Database) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const repository = new DeliveryRepository(db);
  const service = new DeliveryService(repository);
  const controller = new DeliveryController(service);

  app.use('/api', healthRouter);
  app.use('/api/deliveries', createDeliveryRouter(db));
  app.get('/api/riders', controller.getRiders);
  app.get('/api/riders/:riderId/deliveries', controller.getRiderDeliveries);

  return app;
}
