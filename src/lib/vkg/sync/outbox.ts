import crypto from 'crypto';
import { GraphDelta } from '../hooks/engine.js';
import { VkgHook, HookReceipt } from '../hooks/types.js';

export class OutboxManager {
  private queue: { delta: GraphDelta, hook: VkgHook, isBatched: boolean }[] = [];
  private receipts: HookReceipt[] = [];
  private lastReceiptHash: string = 'genesis_hash';
  
  public processedCount = 0;

  enqueue(delta: GraphDelta, hook: VkgHook, isBatched: boolean) {
    this.queue.push({ delta, hook, isBatched });
    
    // For high concurrency, we simulate a fast flush if not batched
    if (!isBatched) {
      this.flushPending();
    }
  }

  flushPending() {
    const toProcess = this.queue.splice(0, this.queue.length);
    for (const item of toProcess) {
      this.generateReceipt(item.delta, item.hook);
      this.processedCount++;
    }
  }

  private generateReceipt(delta: GraphDelta, hook: VkgHook) {
    if (!hook.receipts) return;

    // Simulate input/output hashes quickly
    const inputHash = crypto.createHash('sha256').update(delta.subject).digest('hex');
    const outputHash = crypto.createHash('sha256').update(delta.object).digest('hex');
    const deltaHash = crypto.createHash('sha256').update(delta.predicate + delta.timestamp).digest('hex');

    // Link the chain
    const receiptHash = crypto.createHash('sha256')
      .update(this.lastReceiptHash + inputHash + outputHash + deltaHash)
      .digest('hex');

    const receipt: HookReceipt = {
      inputHash,
      outputHash,
      deltaHash,
      previousReceiptHash: this.lastReceiptHash,
      receiptHash
    };

    this.receipts.push(receipt);
    this.lastReceiptHash = receiptHash;
  }

  getReceiptCount(): number {
    return this.receipts.length;
  }
}
