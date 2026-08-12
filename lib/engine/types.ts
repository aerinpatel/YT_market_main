export const OrderSide = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;
export type OrderSide = (typeof OrderSide)[keyof typeof OrderSide];

export const OrderType = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET',
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export interface Order {
  id: string;
  userId: string;
  creatorId: string;
  side: OrderSide;
  type: OrderType;
  price: number | null; // null for MARKET orders
  quantity: number;
  remainingQuantity: number;
  isCreatorAction: boolean;
  createdAt: number;
  isCancelled?: boolean; // Lazy tombstone for O(1) cancellation
}

export interface Trade {
  id: string;
  creatorId: string;
  buyOrderId: string;
  sellOrderId: string;
  price: number;
  quantity: number;
  executedAt: number;
  buyerId: string;
  sellerId: string;
}

export interface MatchResult {
  trades: Trade[];
  stpCancelledOrders: Order[];
}
