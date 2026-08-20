import { parentPort } from 'worker_threads';
import { OrderBook } from './OrderBook';
import type { Order, Trade, MatchResult } from './types';

// Map of creatorId -> OrderBook
const orderBooks: Map<string, OrderBook> = new Map();

function getOrderBook(creatorId: string): OrderBook {
  let book = orderBooks.get(creatorId);
  if (!book) {
    book = new OrderBook(creatorId);
    orderBooks.set(creatorId, book);
  }
  return book;
}

if (parentPort) {
  parentPort.on('message', (message: any) => {
    const { type, correlationId, payload } = message;

    try {
      switch (type) {
        case 'PLACE_ORDER': {
          const order: Order = payload;
          const book = getOrderBook(order.creatorId);
          const { trades, stpCancelledOrders } = book.addOrder(order);

          // Emit real-time events back to main thread
          if (trades && trades.length > 0) {
            for (const trade of trades) {
              parentPort?.postMessage({
                type: 'EVENT',
                event: 'trade',
                data: trade,
              });
            }
          }

          if (stpCancelledOrders && stpCancelledOrders.length > 0) {
            parentPort?.postMessage({
              type: 'EVENT',
              event: 'stp_cancelled',
              data: {
                userId: order.userId,
                creatorId: order.creatorId,
                cancelledOrders: stpCancelledOrders,
              },
            });
          }

          // Emit depth snapshot
          parentPort?.postMessage({
            type: 'EVENT',
            event: 'depth',
            data: {
              creatorId: order.creatorId,
              snapshot: book.getDepth(),
            },
          });

          // Respond to the specific request
          parentPort?.postMessage({
            type: 'RESPONSE',
            correlationId,
            success: true,
            data: { trades, stpCancelledOrders },
          });
          break;
        }

        case 'CANCEL_ORDER': {
          const { creatorId, orderId } = payload;
          const book = orderBooks.get(creatorId);
          const result = book ? book.cancelOrder(orderId) : false;

          if (book && result) {
            parentPort?.postMessage({
              type: 'EVENT',
              event: 'depth',
              data: {
                creatorId,
                snapshot: book.getDepth(),
              },
            });
          }

          parentPort?.postMessage({
            type: 'RESPONSE',
            correlationId,
            success: true,
            data: result,
          });
          break;
        }

        case 'GET_DEPTH': {
          const { creatorId, depth } = payload;
          const book = orderBooks.get(creatorId);
          const snapshot = book ? book.getDepth(depth) : { bids: [], asks: [] };

          parentPort?.postMessage({
            type: 'RESPONSE',
            correlationId,
            success: true,
            data: snapshot,
          });
          break;
        }

        case 'HYDRATE': {
          const orders: Order[] = payload;
          const allTrades: Trade[] = [];
          let count = 0;

          for (const order of orders) {
            const book = getOrderBook(order.creatorId);
            const { trades } = book.addOrder(order);
            if (trades && trades.length > 0) {
              allTrades.push(...trades);
            }
            count++;
          }

          parentPort?.postMessage({
            type: 'RESPONSE',
            correlationId,
            success: true,
            data: { count, trades: allTrades },
          });
          break;
        }

        default: {
          parentPort?.postMessage({
            type: 'RESPONSE',
            correlationId,
            success: false,
            error: `Unknown action type: ${type}`,
          });
          break;
        }
      }
    } catch (err: any) {
      parentPort?.postMessage({
        type: 'RESPONSE',
        correlationId,
        success: false,
        error: err.message || 'Worker thread error',
      });
    }
  });
}
