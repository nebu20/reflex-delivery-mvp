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

export interface CreateDeliveryDTO {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  itemDescription: string;
}

export interface AssignRiderDTO {
  riderId: string;
}

export interface RecordProofDTO {
  recipientName: string;
  note?: string;
}

export interface Rider {
  id: string;
  name: string;
}

export const RIDERS: Rider[] = [
  { id: 'RIDER-001', name: 'Brian Otieno' },
  { id: 'RIDER-002', name: 'Grace Wanjiku' },
  { id: 'RIDER-003', name: 'David Kamau' },
];
