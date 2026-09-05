/**
 * createApp.ts — Factory that creates an Express app bound to a given db instance.
 * Used by tests to inject an in-memory SQLite database without touching the real one.
 */
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { Router, Request, Response } from 'express';
import { createDelivery, getAllDeliveries } from './models/delivery';
import { CreateDeliveryInput } from './types/delivery';
import healthRouter from './routes/health';

function buildDeliveriesRouter(db: Database.Database) {
  const router = Router();

  function validateCreateInput(body: Partial<CreateDeliveryInput>): string | null {
    const required: (keyof CreateDeliveryInput)[] = [
      'customerName',
      'customerPhone',
      'address',
      'itemDescription',
    ];
    for (const field of required) {
      const value = body[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        return `${field} is required and cannot be empty`;
      }
    }
    return null;
  }

  router.post('/', (req: Request, res: Response) => {
    const error = validateCreateInput(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const input: CreateDeliveryInput = {
      customerName: String(req.body.customerName).trim(),
      customerPhone: String(req.body.customerPhone).trim(),
      address: String(req.body.address).trim(),
      itemDescription: String(req.body.itemDescription).trim(),
    };
    const delivery = createDelivery(db, input);
    res.status(201).json(delivery);
  });

  router.get('/', (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const deliveries = getAllDeliveries(db, status);
    res.json(deliveries);
  });

  return router;
}

export function createApp(db: Database.Database) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', healthRouter);
  app.use('/api/deliveries', buildDeliveriesRouter(db));
  return app;
}
