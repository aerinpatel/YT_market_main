import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Order, Trade, MatchResult } from './types';
import { OrderBook } from './OrderBook';

export class MatchingEngine extends EventEmitter {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private localBooks: Map<string, OrderBook> = new Map(); // Fallback if worker is not available
  private isWorkerReady: boolean = false;

  constructor() {
    super();
    this.initWorker();
  }

  private initWorker() {
    try {
      const workerPath = path.resolve(__dirname, 'matchingWorker.ts');
       
      // Node.js worker with tsx loader support for TypeScript
      this.worker = new Worker(workerPath, {
        execArgv: ['-r', 'tsx/cjs'],
      });

      this.worker.on('message', (message: any) => {
        const { type, correlationId, success, data, error, event } = message;

        if (type === 'RESPONSE') {
          const pending = this.pendingRequests.get(correlationId);
          if (pending) {
            this.pendingRequests.delete(correlationId);
            if (success) {
              pending.resolve(data);
            } else {
              pending.reject(new Error(error || 'Worker execution failed'));
            }
          }
        } else if (type === 'EVENT') {
          // Re-emit worker events to parent process (for Socket.IO and listeners)
          this.emit(event, data);
        }
      });

      this.worker.on('error', (err) => {
        console.error('MatchingEngine Worker error (falling back to in-memory mode):', err.message);
        this.isWorkerReady = false;
      });

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          console.warn(`MatchingEngine Worker exited with code ${code}`);
          this.isWorkerReady = false;
        }
      });

      this.isWorkerReady = true;
    } catch (err: any) {
      console.warn('Worker Thread initialization skipped, using synchronous in-memory engine:', err.message);
      this.worker = null;
      this.isWorkerReady = false;
    }
  }

  private sendWorkerMessage<T>(type: string, payload: any): Promise<T> {
    if (!this.worker || !this.isWorkerReady) {
      return this.localExecute<T>(type, payload);
    }

    return new Promise((resolve, reject) => {
      const correlationId = uuidv4();
      
      // 5-second timeout for worker response
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(correlationId)) {
          this.pendingRequests.delete(correlationId);
          // Fallback to local execution on timeout
          this.localExecute<T>(type, payload).then(resolve).catch(reject);
        }
      }, 5000);

      this.pendingRequests.set(correlationId, {
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

      this.worker!.postMessage({ type, correlationId, payload });
    });
  }

  // Local fallback execution if worker is unavailable
  private async localExecute<T>(type: string, payload: any): Promise<T> {
    switch (type) {
      case 'PLACE_ORDER': {
        const order: Order = payload;
        let book = this.localBooks.get(order.creatorId);
        if (!book) {
          book = new OrderBook(order.creatorId);
          this.localBooks.set(order.creatorId, book);
        }
        const matchRes = book.addOrder(order);

        if (matchRes.trades.length > 0) {
          for (const trade of matchRes.trades) {
            this.emit('trade', trade);
          }
        }
        if (matchRes.stpCancelledOrders && matchRes.stpCancelledOrders.length > 0) {
          this.emit('stp_cancelled', {
            userId: order.userId,
            creatorId: order.creatorId,
            cancelledOrders: matchRes.stpCancelledOrders,
          });
        }
        this.emit('depth', {
          creatorId: order.creatorId,
          snapshot: book.getDepth(),
        });
        return matchRes as unknown as T;
      }

      case 'CANCEL_ORDER': {
        const { creatorId, orderId } = payload;
        const book = this.localBooks.get(creatorId);
        const res = book ? book.cancelOrder(orderId) : false;
        if (book && res) {
          this.emit('depth', {
            creatorId,
            snapshot: book.getDepth(),
          });
        }
        return res as unknown as T;
      }

      case 'GET_DEPTH': {
        const { creatorId, depth } = payload;
        const book = this.localBooks.get(creatorId);
        return (book ? book.getDepth(depth) : { bids: [], asks: [] }) as unknown as T;
      }

      case 'HYDRATE': {
        const orders: Order[] = payload;
        const allTrades: Trade[] = [];
        let count = 0;
        for (const order of orders) {
          let book = this.localBooks.get(order.creatorId);
          if (!book) {
            book = new OrderBook(order.creatorId);
            this.localBooks.set(order.creatorId, book);
          }
          const { trades } = book.addOrder(order);
          if (trades && trades.length > 0) {
            allTrades.push(...trades);
          }
          count++;
        }
        return { count, trades: allTrades } as unknown as T;
      }

      default:
        throw new Error(`Unsupported action: ${type}`);
    }
  }

  public async placeOrder(order: Order): Promise<MatchResult> {
    return this.sendWorkerMessage<MatchResult>('PLACE_ORDER', order);
  }

  public async cancelOrder(creatorId: string, orderId: string): Promise<boolean> {
    return this.sendWorkerMessage<boolean>('CANCEL_ORDER', { creatorId, orderId });
  }

  public async getOrderBookSnapshot(creatorId: string, depth: number = 10): Promise<{ bids: any[]; asks: any[] }> {
    return this.sendWorkerMessage<{ bids: any[]; asks: any[] }>('GET_DEPTH', { creatorId, depth });
  }

  public async hydrateOrders(orders: Order[]): Promise<{ count: number; trades: Trade[] }> {
    return this.sendWorkerMessage<{ count: number; trades: Trade[] }>('HYDRATE', orders);
  }
}

// Global Singleton Instance
const globalForEngine = global as unknown as { matchingEngine: MatchingEngine };
export const matchingEngine = globalForEngine.matchingEngine || new MatchingEngine();
if (process.env.NODE_ENV !== 'production') globalForEngine.matchingEngine = matchingEngine;
