// Linked-List Node
export class ListNode<T> {
  val: T;
  next: ListNode<T> | null;

  constructor(value: T) {
    this.val = value;
    this.next = null;
  }
}

// Linked-List FIFO Queue with O(1) push and O(1) pop
export class Queue<T> {
  private front: ListNode<T> | null = null;
  private back: ListNode<T> | null = null;
  private sz: number = 0;

  push(value: T): void {
    this.sz += 1;
    const newNode = new ListNode(value);

    if (this.back === null) {
      this.front = newNode;
      this.back = newNode;
      return;
    }

    this.back.next = newNode;
    this.back = newNode;
  }

  pop(): T | null {
    if (this.front === null) {
      return null;
    }

    this.sz -= 1;
    const val = this.front.val;
    this.front = this.front.next;

    if (this.front === null) {
      this.back = null;
    }

    return val;
  }

  peek(): T | null {
    return this.front?.val ?? null;
  }

  size(): number {
    return this.sz;
  }

  isEmpty(): boolean {
    return this.sz === 0;
  }

  toArray(): T[] {
    const items: T[] = [];
    let curr = this.front;
    while (curr !== null) {
      items.push(curr.val);
      curr = curr.next;
    }
    return items;
  }
}

// One heap node = one key (price) + one linked-list queue of orders
export class HeapNode<T> {
  key: number;
  queue: Queue<T>;

  constructor(key: number, queue: Queue<T> = new Queue<T>()) {
    this.key = key;
    this.queue = queue;
  }
}

// ======================================================
// MIN HEAP (Lowest price at root — used for ASKS)
// ======================================================
export class MinHeap<T> {
  private heap: HeapNode<T>[] = [];
  private keyMap: Map<number, HeapNode<T>> = new Map();

  private heapifyUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);

      if (this.heap[parent].key <= this.heap[idx].key) {
        break;
      }

      [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
      idx = parent;
    }
  }

  private heapifyDown(idx: number): void {
    const n = this.heap.length;

    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      let smallest = idx;

      if (left < n && this.heap[left].key < this.heap[smallest].key) {
        smallest = left;
      }

      if (right < n && this.heap[right].key < this.heap[smallest].key) {
        smallest = right;
      }

      if (smallest === idx) {
        break;
      }

      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }

  push(key: number, value: T): void {
    // Key already exists — append to linked-list queue in O(1)
    if (this.keyMap.has(key)) {
      const node = this.keyMap.get(key)!;
      node.queue.push(value);
      return;
    }

    // Key does not exist — create new HeapNode
    const queue = new Queue<T>();
    queue.push(value);

    const node = new HeapNode(key, queue);
    this.heap.push(node);
    this.keyMap.set(key, node);

    this.heapifyUp(this.heap.length - 1);
  }

  pop(): HeapNode<T> | null {
    if (this.heap.length === 0) {
      return null;
    }

    if (this.heap.length === 1) {
      const node = this.heap.pop()!;
      this.keyMap.delete(node.key);
      return node;
    }

    const result = this.heap[0];
    this.keyMap.delete(result.key);

    this.heap[0] = this.heap.pop()!;
    this.heapifyDown(0);

    return result;
  }

  top(): HeapNode<T> | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  peek(): HeapNode<T> | null {
    return this.top();
  }

  size(): number {
    return this.heap.length;
  }

  has(key: number): boolean {
    return this.keyMap.has(key);
  }

  get(key: number): HeapNode<T> | undefined {
    return this.keyMap.get(key);
  }

  getAllNodes(): HeapNode<T>[] {
    return this.heap;
  }
}

// ======================================================
// MAX HEAP (Highest price at root — used for BIDS)
// ======================================================
export class MaxHeap<T> {
  private heap: HeapNode<T>[] = [];
  private keyMap: Map<number, HeapNode<T>> = new Map();

  private heapifyUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);

      if (this.heap[parent].key >= this.heap[idx].key) {
        break;
      }

      [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
      idx = parent;
    }
  }

  private heapifyDown(idx: number): void {
    const n = this.heap.length;

    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      let largest = idx;

      if (left < n && this.heap[left].key > this.heap[largest].key) {
        largest = left;
      }

      if (right < n && this.heap[right].key > this.heap[largest].key) {
        largest = right;
      }

      if (largest === idx) {
        break;
      }

      [this.heap[idx], this.heap[largest]] = [this.heap[largest], this.heap[idx]];
      idx = largest;
    }
  }

  push(key: number, value: T): void {
    // Key already exists — append to linked-list queue in O(1)
    if (this.keyMap.has(key)) {
      const node = this.keyMap.get(key)!;
      node.queue.push(value);
      return;
    }

    // Key does not exist — create new HeapNode
    const queue = new Queue<T>();
    queue.push(value);

    const node = new HeapNode(key, queue);
    this.heap.push(node);
    this.keyMap.set(key, node);

    this.heapifyUp(this.heap.length - 1);
  }

  pop(): HeapNode<T> | null {
    if (this.heap.length === 0) {
      return null;
    }

    if (this.heap.length === 1) {
      const node = this.heap.pop()!;
      this.keyMap.delete(node.key);
      return node;
    }

    const result = this.heap[0];
    this.keyMap.delete(result.key);

    this.heap[0] = this.heap.pop()!;
    this.heapifyDown(0);

    return result;
  }

  top(): HeapNode<T> | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  peek(): HeapNode<T> | null {
    return this.top();
  }

  size(): number {
    return this.heap.length;
  }

  has(key: number): boolean {
    return this.keyMap.has(key);
  }

  get(key: number): HeapNode<T> | undefined {
    return this.keyMap.get(key);
  }

  getAllNodes(): HeapNode<T>[] {
    return this.heap;
  }
}
