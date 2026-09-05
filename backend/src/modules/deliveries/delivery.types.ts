export type DeliveryStatus = 'REQUESTED' | 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED';

export interface Delivery {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  address?: string;
  itemDescription: string;
  status: DeliveryStatus;
  assignedRider?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryDTO {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  itemDescription: string;
}
