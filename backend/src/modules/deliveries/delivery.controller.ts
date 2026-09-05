import { Request, Response } from 'express';
import { DeliveryService } from './delivery.service';

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
}
