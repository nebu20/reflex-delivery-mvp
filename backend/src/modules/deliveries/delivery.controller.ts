import { Request, Response } from 'express';
import { DeliveryService, NotFoundError, ConflictError } from './delivery.service';
import { RIDERS } from './delivery.types';

export class DeliveryController {
  constructor(private service: DeliveryService) {}

  createDelivery = (req: Request, res: Response): void => {
    try {
      const delivery = this.service.createDelivery(req.body);
      res.status(201).json(delivery);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Invalid input' });
    }
  };

  getAllDeliveries = (req: Request, res: Response): void => {
    const status = req.query.status as string | undefined;
    const deliveries = this.service.getAllDeliveries(status);
    res.status(200).json(deliveries);
  };

  getDeliveryById = (req: Request, res: Response): void => {
    const id = req.params.id as string;
    const delivery = this.service.getDeliveryById(id);
    if (!delivery) {
      res.status(404).json({ error: `Delivery with ID '${id}' not found` });
      return;
    }
    res.status(200).json(delivery);
  };

  assignRider = (req: Request, res: Response): void => {
    const id = req.params.id as string;
    const { riderId } = req.body || {};

    try {
      const updated = this.service.assignRider(id, riderId);
      res.status(200).json(updated);
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
      } else if (err instanceof ConflictError) {
        res.status(409).json({ error: err.message });
      } else {
        res.status(400).json({ error: err.message || 'Invalid request' });
      }
    }
  };

  updateStatus = (req: Request, res: Response): void => {
    const id = req.params.id as string;
    const { status } = req.body || {};

    try {
      const updated = this.service.updateDeliveryStatus(id, status);
      res.status(200).json(updated);
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
      } else if (err instanceof ConflictError) {
        res.status(409).json({ error: err.message });
      } else {
        res.status(400).json({ error: err.message || 'Invalid status transition' });
      }
    }
  };

  recordProof = (req: Request, res: Response): void => {
    const id = req.params.id as string;
    try {
      const updated = this.service.recordProof(id, req.body || {});
      res.status(200).json(updated);
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
      } else if (err instanceof ConflictError) {
        res.status(409).json({ error: err.message });
      } else {
        res.status(400).json({ error: err.message || 'Invalid input' });
      }
    }
  };

  getRiderDeliveries = (req: Request, res: Response): void => {
    const riderId = req.params.riderId as string;
    try {
      const deliveries = this.service.getDeliveriesByRider(riderId);
      res.status(200).json(deliveries);
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
      } else {
        res.status(400).json({ error: err.message });
      }
    }
  };

  getRiders = (_req: Request, res: Response): void => {
    res.status(200).json(RIDERS);
  };
}
