export type DeliveryStatus = 'REQUESTED' | 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED';

export interface ProofOfDelivery {
  recipientName: string;
  note?: string | null;
  confirmedAt: string;
}

export interface Delivery {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  address?: string;
  itemDescription: string;
  status: DeliveryStatus;
  assignedRider?: string | null;
  proofOfDelivery?: ProofOfDelivery | null;
  createdAt: string;
  updatedAt: string;
}
