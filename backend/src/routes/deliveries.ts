import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { createDelivery, getAllDeliveries } from '../models/delivery';
import { CreateDeliveryInput } from '../types/delivery';

const router = Router();

/** Validates that all required string fields are present and non-empty. */
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

/**
 * POST /api/deliveries
 * Create a new delivery request.
 */
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

  const delivery = createDelivery(getDb(), input);
  res.status(201).json(delivery);
});

/**
 * GET /api/deliveries
 * Return all deliveries, optionally filtered by ?status=PENDING
 */
router.get('/', (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const deliveries = getAllDeliveries(getDb(), status);
  res.json(deliveries);
});

export default router;
