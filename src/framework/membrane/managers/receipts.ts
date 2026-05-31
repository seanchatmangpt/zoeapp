import { MembraneReceipt } from '../types';
import { sha256, canonicalStringify } from '../../../lib/crypto/receipts';

export class ReceiptManager {
  private chain: MembraneReceipt[] = [];

  public clear() {
    this.chain = [];
  }

  public append(receipt: MembraneReceipt) {
    this.chain.push(receipt);
  }

  public getLastHash(): string {
    if (this.chain.length === 0) return '';
    return this.chain[this.chain.length - 1].deltaHash;
  }

  public getHistory(): MembraneReceipt[] {
    return [...this.chain];
  }

  public async emitRefusal(
    commandId: string,
    capabilityId: string,
    prevHash: string,
    errorMsg: string
  ): Promise<MembraneReceipt> {
    const timestamp = new Date().toISOString();
    const data = { commandId, capabilityId, error: errorMsg, success: false };
    const hash = sha256(prevHash + canonicalStringify(data));

    const receipt: MembraneReceipt = {
      id: `rec_refuse_${Math.random().toString(36).substring(2, 11)}`,
      commandId,
      capabilityId,
      timestamp,
      verdict: 'deny',
      success: false,
      deltaHash: hash,
      previousHash: prevHash,
      error: errorMsg
    };

    this.append(receipt);
    return receipt;
  }

  public validateChain(): { valid: boolean; error?: string } {
    for (let i = 0; i < this.chain.length; i++) {
      const prevHash = i === 0 ? '' : this.chain[i - 1].deltaHash;
      if (this.chain[i].previousHash !== prevHash) {
        return { valid: false, error: `Broken lineage at index ${i}` };
      }
    }
    return { valid: true };
  }
}
