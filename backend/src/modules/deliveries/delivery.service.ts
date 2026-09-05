import { DeliveryRepository } from './delivery.repository';
import { Delivery, CreateDeliveryDTO, RecordProofDTO, RIDERS } from './delivery.types';

export class NotFoundError extends Error {}
export class ValidationError extends Error {}
export class ConflictError extends Error {}

const VALID_STATUSES = ['REQUESTED', 'PENDING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'];

export class DeliveryService {
  constructor(private repository: DeliveryRepository) {}

  createDelivery(dto: Partial<CreateDeliveryDTO>): Delivery {
    const customerName = dto.customerName?.toString().trim();
    const customerPhone = dto.customerPhone?.toString().trim();
    const deliveryAddress = (dto.deliveryAddress || (dto as any).address)?.toString().trim();
    const itemDescription = dto.itemDescription?.toString().trim();

    if (!customerName) {
      throw new ValidationError('customerName is required');
    }
    if (!customerPhone) {
      throw new ValidationError('customerPhone is required');
    }
    if (!deliveryAddress) {
      throw new ValidationError('deliveryAddress is required');
    }
    if (!itemDescription) {
      throw new ValidationError('itemDescription is required');
    }

    return this.repository.create({
      customerName,
      customerPhone,
      deliveryAddress,
      itemDescription,
    });
  }

  getAllDeliveries(statusFilter?: string): Delivery[] {
    return this.repository.findAll(statusFilter);
  }

  getDeliveryById(id: string): Delivery | null {
    return this.repository.findById(id);
  }

  assignRider(id: string, riderId?: string): Delivery {
    const cleanRiderId = riderId?.toString().trim();
    if (!cleanRiderId) {
      throw new ValidationError('riderId is required');
    }

    const delivery = this.repository.findById(id);
    if (!delivery) {
      throw new NotFoundError(`Delivery with ID '${id}' not found`);
    }

    if (delivery.status !== 'REQUESTED') {
      throw new ConflictError('Delivery has already been assigned');
    }

    return this.repository.updateAssignment(id, cleanRiderId, 'ASSIGNED')!;
  }

  updateDeliveryStatus(id: string, targetStatus?: string): Delivery {
    const cleanStatus = targetStatus?.toString().trim();
    if (!cleanStatus || !VALID_STATUSES.includes(cleanStatus)) {
      throw new ValidationError('Valid status value is required');
    }

    const delivery = this.repository.findById(id);
    if (!delivery) {
      throw new NotFoundError(`Delivery with ID '${id}' not found`);
    }

    const currentStatus = delivery.status;

    // Allowed transitions ONLY:
    // ASSIGNED -> PICKED_UP
    // PICKED_UP -> DELIVERED
    const isAllowed =
      (currentStatus === 'ASSIGNED' && cleanStatus === 'PICKED_UP') ||
      (currentStatus === 'PICKED_UP' && cleanStatus === 'DELIVERED');

    if (!isAllowed) {
      throw new ConflictError(`Invalid status transition from ${currentStatus} to ${cleanStatus}`);
    }

    return this.repository.updateStatus(id, cleanStatus)!;
  }

  recordProof(id: string, dto: Partial<RecordProofDTO>): Delivery {
    const recipientName = dto.recipientName?.toString().trim();
    if (!recipientName) {
      throw new ValidationError('recipientName is required');
    }

    const delivery = this.repository.findById(id);
    if (!delivery) {
      throw new NotFoundError(`Delivery with ID '${id}' not found`);
    }

    if (delivery.status !== 'DELIVERED') {
      throw new ConflictError('Proof of delivery can only be recorded for delivered orders');
    }

    if (delivery.proofOfDelivery) {
      throw new ConflictError('Proof of delivery has already been recorded for this order');
    }

    const note = dto.note?.toString().trim() || null;
    return this.repository.recordProof(id, recipientName, note)!;
  }

  getDeliveriesByRider(riderId: string): Delivery[] {
    const riderExists = RIDERS.some((r) => r.id === riderId);
    if (!riderExists) {
      throw new NotFoundError(`Rider '${riderId}' not found`);
    }
    return this.repository.findByRiderId(riderId);
  }
}
