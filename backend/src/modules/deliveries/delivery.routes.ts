import { Router } from 'express';
import Database from 'better-sqlite3';
import { DeliveryRepository } from './delivery.repository';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';

export function createDeliveryRouter(db: Database.Database): Router {
  const repository = new DeliveryRepository(db);
  const service = new DeliveryService(repository);
  const controller = new DeliveryController(service);

  const router = Router();

  router.post('/', controller.createDelivery);
  router.get('/', controller.getAllDeliveries);
  router.get('/:id', controller.getDeliveryById);
  router.patch('/:id/assignment', controller.assignRider);
  router.patch('/:id/status', controller.updateStatus);
  router.patch('/:id/proof', controller.recordProof);

  return router;
}
