import { DeliveryRepository } from './delivery.repository';
import { Delivery, CreateDeliveryDTO } from './delivery.types';

export class DeliveryService {
  constructor(private repository: DeliveryRepository) {}

  createDelivery(dto: Partial<CreateDeliveryDTO>): Delivery {
    // Validate required fields
    const customerName = dto.customerName?.toString().trim();
    const customerPhone = dto.customerPhone?.toString().trim();
    // Allow deliveryAddress or address
    const deliveryAddress = (dto.deliveryAddress || (dto as any).address)?.toString().trim();
    const itemDescription = dto.itemDescription?.toString().trim();

    if (!customerName) {
      throw new Error('customerName is required');
    }
    if (!customerPhone) {
      throw new Error('customerPhone is required');
    }
    if (!deliveryAddress) {
      throw new Error('deliveryAddress is required');
    }
    if (!itemDescription) {
      throw new Error('itemDescription is required');
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
}
