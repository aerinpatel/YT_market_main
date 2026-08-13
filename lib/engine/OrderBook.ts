import { OrderSide, OrderType } from './types';
import type { Order, Trade, MatchResult } from './types';
import { MinHeap, MaxHeap } from './Heap';
import type { HeapNode } from './Heap';
import { v4 as uuidv4 } from 'uuid';

/**
 * High-Performance OrderBook using LinkedList-backed FIFO Queues in Min/Max Heaps.
 * - Bids: Max-Heap of PriceLevels (highest price at root, O(1) top/peek).
 * - Asks: Min-Heap of PriceLevels (lowest price at root, O(1) top/peek).
 * - Each Price Level contains a true LinkedList FIFO Queue with O(1) push and O(1) pop.
 */
export class OrderBook {
  public creatorId: string;
  private bids: MaxHeap<Order>; // Max-Heap for Buy Orders
  private asks: MinHeap<Order>; // Min-Heap for Sell Orders
  private orderMap: Map<string, Order> = new Map(); // O(1) order lookup & lazy tombstone cancellation

  constructor(creatorId: string) {
    this.creatorId = creatorId;
    this.bids = new MaxHeap<Order>();
    this.asks = new MinHeap<Order>();
  }

  public getOrder(orderId: string): Order | undefined {
    return this.orderMap.get(orderId);
  }

  public cancelOrder(orderId: string): boolean {
    const order = this.orderMap.get(orderId);
    if (!order || order.isCancelled) return false;

    // O(1) lazy tombstone cancellation & map cleanup
    order.isCancelled = true;
    order.remainingQuantity = 0;
    this.orderMap.delete(orderId);
    return true;
  }

  public addOrder(order: Order): MatchResult {
    this.orderMap.set(order.id, order);

    let matchRes: MatchResult = { trades: [], stpCancelledOrders: [] };
    if (order.side === OrderSide.BUY) {
      // Match incoming Buy against Ask Min-Heap
      matchRes = this.matchOrder(
        order, 
        this.asks, 
        (askPrice) => order.type === OrderType.MARKET || askPrice <= order.price!
      );
      if (order.remainingQuantity > 0 && order.type === OrderType.LIMIT && order.price !== null) {
        this.bids.push(order.price, order);
      }
    } else {
      // Match incoming Sell against Bid Max-Heap
      matchRes = this.matchOrder(
        order, 
        this.bids, 
        (bidPrice) => order.type === OrderType.MARKET || bidPrice >= order.price!
      );
      if (order.remainingQuantity > 0 && order.type === OrderType.LIMIT && order.price !== null) {
        this.asks.push(order.price, order);
      }
    }

    // Clean up incoming order from orderMap if it didn't rest in the book
    if (order.remainingQuantity === 0) {
      this.orderMap.delete(order.id);
    } else if (order.type === OrderType.MARKET) {
      // Market orders that couldn't be fully filled are auto-cancelled
      order.isCancelled = true;
      this.orderMap.delete(order.id);
    }

    return matchRes;
  }

  private matchOrder(
    incomingOrder: Order, 
    oppositeHeap: MinHeap<Order> | MaxHeap<Order>, 
    priceCondition: (price: number) => boolean
  ): MatchResult {
    const trades: Trade[] = [];
    const stpCancelledOrders: Order[] = [];
    const baseTime = Date.now();
    let seq = 0;

    while (incomingOrder.remainingQuantity > 0 && oppositeHeap.size() > 0) {
      const bestLevel = oppositeHeap.top()!;

      if (!priceCondition(bestLevel.key)) {
        break; // No matching price available in the book
      }

      // Iterate through the LinkedList FIFO queue of resting orders at this best price level
      while (!bestLevel.queue.isEmpty() && incomingOrder.remainingQuantity > 0) {
        const restingOrder = bestLevel.queue.peek()!;

        // 1. Skip and prune lazy cancelled tombstones in O(1)
        if (restingOrder.isCancelled) {
          bestLevel.queue.pop();
          this.orderMap.delete(restingOrder.id);
          continue;
        }

        // 2. Self-Trade Prevention: prevent account from matching its own resting order
        if (incomingOrder.userId === restingOrder.userId) {
          restingOrder.isCancelled = true;
          stpCancelledOrders.push(restingOrder);
          bestLevel.queue.pop();
          this.orderMap.delete(restingOrder.id);
          continue;
        }

        // 3. Calculate trade quantity
        const tradeQuantity = Math.min(incomingOrder.remainingQuantity, restingOrder.remainingQuantity);
        
        incomingOrder.remainingQuantity -= tradeQuantity;
        restingOrder.remainingQuantity -= tradeQuantity;

        const trade: Trade = {
          id: uuidv4(),
          creatorId: this.creatorId,
          buyOrderId: incomingOrder.side === OrderSide.BUY ? incomingOrder.id : restingOrder.id,
          sellOrderId: incomingOrder.side === OrderSide.SELL ? incomingOrder.id : restingOrder.id,
          buyerId: incomingOrder.side === OrderSide.BUY ? incomingOrder.userId : restingOrder.userId,
          sellerId: incomingOrder.side === OrderSide.SELL ? incomingOrder.userId : restingOrder.userId,
          price: bestLevel.key, // Maker execution price (last popped amount from the min/max heap)
          quantity: tradeQuantity,
          executedAt: baseTime + (seq++),
        };
        trades.push(trade);

        if (restingOrder.remainingQuantity === 0) {
          bestLevel.queue.pop();
          this.orderMap.delete(restingOrder.id);
        }
      }

      if (bestLevel.queue.isEmpty()) {
        oppositeHeap.pop();
      }
    }

    return { trades, stpCancelledOrders };
  }

  // Get Top Levels Depth for UI & Charts
  public getDepth(levels: number = 10) {
    return {
      bids: this.getTopLevels(this.bids, 'DESC', levels),
      asks: this.getTopLevels(this.asks, 'ASC', levels),
    };
  }

  private getTopLevels(
    heap: MinHeap<Order> | MaxHeap<Order>, 
    sortDirection: 'ASC' | 'DESC', 
    limit: number
  ) {
    return heap.getAllNodes()
      .map(node => ({
        price: node.key,
        quantity: node.queue.toArray().reduce((sum, o) => sum + (o.isCancelled ? 0 : o.remainingQuantity), 0)
      }))
      .filter(l => l.quantity > 0)
      .sort((a, b) => sortDirection === 'DESC' ? b.price - a.price : a.price - b.price)
      .slice(0, limit);
  }
}
