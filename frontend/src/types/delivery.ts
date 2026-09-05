/** Delivery domain types mirroring the backend. */

export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED';

export interface Delivery {
  id: number;
  customerName: string;
  customerPhone: string;
  address: string;
  itemDescription: string;
  status: DeliveryStatus;
  assignedRider: string | null;
  createdAt: string;
  updatedAt: string;
}
