import { MembraneChain } from './MembraneChain';
import { MembraneReceipt, TemporalRoute, Claimed, Witnessed } from './types';
import { blake3, canonicalStringify } from '../../../lib/crypto/receipts';

function resolveConflictCRDT(
  key: string,
  ancestorVal: any,
  sourceVal: any,
  targetVal: any,
  sourceTime: number,
  targetTime: number
): any {
  // If array, perform set union
  if (Array.isArray(sourceVal) && Array.isArray(targetVal)) {
    return Array.from(new Set([...sourceVal, ...targetVal]));
  }

  // If number, perform PN-Counter delta addition
  if (typeof sourceVal === 'number' && typeof targetVal === 'number') {
    const anc = typeof ancestorVal === 'number' ? ancestorVal : 0;
    return anc + (sourceVal - anc) + (targetVal - anc);
  }

  // If object, perform recursive merge
  if (
    sourceVal && typeof sourceVal === 'object' &&
    targetVal && typeof targetVal === 'object' &&
    !Array.isArray(sourceVal) && !Array.isArray(targetVal)
  ) {
    const anc = (ancestorVal && typeof ancestorVal === 'object' && !Array.isArray(ancestorVal)) ? ancestorVal : {};
    const allKeys = new Set([...Object.keys(anc), ...Object.keys(sourceVal), ...Object.keys(targetVal)]);
    const mergedObj: Record<string, any> = {};
    for (const k of allKeys) {
      mergedObj[k] = resolveConflictCRDT(
        k,
        anc[k],
        sourceVal[k] !== undefined ? sourceVal[k] : anc[k],
        targetVal[k] !== undefined ? targetVal[k] : anc[k],
        sourceTime,
        targetTime
      );
    }
    return mergedObj;
  }

  // Fallback to LWW (Last-Write-Wins)
  return sourceTime > targetTime ? sourceVal : targetVal;
}

export class TemporalNavigator {
  private chain: MembraneChain;
  private currentTimestamp: number;
  private activeBranch: string = 'main';
  private branches: Map<string, { parentBranchId: string; forkTimestamp: number }> = new Map();
  private subscribers: Set<(route: TemporalRoute) => void> = new Set();

  constructor(chain: MembraneChain) {
    this.chain = chain;
    const receipts = this.chain.getReceipts();
    if (receipts.length > 0) {
      this.currentTimestamp = receipts[receipts.length - 1].timestamp;
    } else {
      this.currentTimestamp = Date.now();
    }
  }

  getActiveBranch(): string {
    return this.activeBranch;
  }

  switchBranch(branchId: string) {
    const branchReceipts = this.getReceiptsForBranch(branchId);
    if (branchReceipts.length > 0) {
      this.currentTimestamp = branchReceipts[branchReceipts.length - 1].timestamp;
    }
    this.activeBranch = branchId;
    this.notify();
  }

  getReceiptsForBranch(branchId: string): MembraneReceipt[] {
    const visibleReceipts: MembraneReceipt[] = [];
    let currentId = branchId;
    let limitTimestamp = Infinity;

    const visited = new Set<string>();

    while (true) {
      if (visited.has(currentId)) {
        break; // Prevent infinite cycle in lineage
      }
      visited.add(currentId);

      const branchReceipts = this.chain.getReceipts().filter(r => 
        (r.branchId || 'main') === currentId && r.timestamp <= limitTimestamp
      );
      visibleReceipts.push(...branchReceipts);

      const lineage = this.branches.get(currentId);
      if (!lineage) {
        if (currentId !== 'main') {
          // Fallback ancestry to 'main'
          const mainReceipts = this.chain.getReceipts().filter(r => 
            (r.branchId || 'main') === 'main' && r.timestamp <= limitTimestamp
          );
          visibleReceipts.push(...mainReceipts);
        }
        break;
      }

      currentId = lineage.parentBranchId;
      limitTimestamp = lineage.forkTimestamp;
    }

    // Deduplicate by receipt id and sort by timestamp
    const uniqueReceiptsMap = new Map<string, MembraneReceipt>();
    for (const r of visibleReceipts) {
      uniqueReceiptsMap.set(r.id, r);
    }
    return Array.from(uniqueReceiptsMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  navigate(path: string, state: Record<string, any>): MembraneReceipt {
    const timestamp = Date.now();
    const receipt: MembraneReceipt = {
      id: Math.random().toString(36).substring(7),
      timestamp,
      path,
      state,
      branchId: this.activeBranch,
      type: 'navigate'
    };
    this.chain.append(receipt);
    this.currentTimestamp = timestamp;
    this.notify();
    return receipt;
  }

  witness<T extends Record<string, any>>(claimed: Claimed<T>, path: string): Witnessed<T> {
    const receipt = this.navigate(path, claimed.value);
    return {
      __brand: 'Witnessed',
      value: claimed.value,
      receipt
    } as Witnessed<T>;
  }

  fork(newBranchId: string, parentTimestamp?: number): MembraneReceipt {
    const forkTime = parentTimestamp ?? this.currentTimestamp;
    const activeBranchReceipts = this.getReceiptsForBranch(this.activeBranch);
    const pastActive = activeBranchReceipts.filter(r => r.timestamp <= forkTime);
    const parentReceipt = pastActive.length > 0 ? pastActive[pastActive.length - 1] : null;

    const parentState = parentReceipt ? parentReceipt.state : {};
    const parentStateHash = blake3(canonicalStringify(parentState));

    this.branches.set(newBranchId, { parentBranchId: this.activeBranch, forkTimestamp: forkTime });

    const receipt: MembraneReceipt = {
      id: `fork-${newBranchId}-${Math.random().toString(36).substring(7)}`,
      timestamp: forkTime,
      path: parentReceipt ? parentReceipt.path : '/',
      state: { ...parentState },
      branchId: newBranchId,
      type: 'fork',
      parentBranchId: this.activeBranch,
      parentStateHash
    };

    this.chain.append(receipt);
    return receipt;
  }

  private getLatestTimestampForKey(branchReceipts: MembraneReceipt[], key: string, fallbackTimestamp: number): number {
    for (let i = branchReceipts.length - 1; i >= 0; i--) {
      const current = branchReceipts[i];
      const prev = i > 0 ? branchReceipts[i - 1] : null;
      if (current.state && current.state[key] !== undefined) {
        if (!prev || prev.state[key] !== current.state[key]) {
          return current.timestamp;
        }
      }
    }
    return fallbackTimestamp;
  }

  merge(sourceBranchId: string, targetBranchId: string, strategy: 'LWW' | 'CRDT' = 'LWW'): MembraneReceipt {
    const sourceReceipts = this.getReceiptsForBranch(sourceBranchId);
    const targetReceipts = this.getReceiptsForBranch(targetBranchId);

    if (sourceReceipts.length === 0) {
      throw new Error(`Source branch ${sourceBranchId} has no history`);
    }
    if (targetReceipts.length === 0) {
      throw new Error(`Target branch ${targetBranchId} has no history`);
    }

    const sourceReceipt = sourceReceipts[sourceReceipts.length - 1];
    const targetReceipt = targetReceipts[targetReceipts.length - 1];

    const sourceState = sourceReceipt.state;
    const targetState = targetReceipt.state;

    // Find the closest common ancestor receipt
    const sourceIds = new Set(sourceReceipts.map(r => r.id));
    const commonReceipts = targetReceipts.filter(r => sourceIds.has(r.id));
    const ancestorReceipt = commonReceipts[commonReceipts.length - 1];
    const ancestorState = ancestorReceipt ? ancestorReceipt.state : {};

    const mergedState: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(ancestorState), ...Object.keys(sourceState), ...Object.keys(targetState)]);

    for (const key of allKeys) {
      const ancVal = ancestorState[key];
      const srcVal = sourceState[key];
      const tgtVal = targetState[key];

      const changedInSrc = srcVal !== undefined && srcVal !== ancVal;
      const changedInTgt = tgtVal !== undefined && tgtVal !== ancVal;

      if (changedInSrc && changedInTgt) {
        const srcTime = this.getLatestTimestampForKey(sourceReceipts, key, sourceReceipt.timestamp);
        const tgtTime = this.getLatestTimestampForKey(targetReceipts, key, targetReceipt.timestamp);

        if (strategy === 'LWW') {
          mergedState[key] = srcTime > tgtTime ? srcVal : tgtVal;
        } else {
          mergedState[key] = resolveConflictCRDT(key, ancVal, srcVal, tgtVal, srcTime, tgtTime);
        }
      } else if (changedInSrc) {
        mergedState[key] = srcVal;
      } else if (changedInTgt) {
        mergedState[key] = tgtVal;
      } else {
        mergedState[key] = srcVal !== undefined ? srcVal : tgtVal;
      }
    }

    const mergeTimestamp = Date.now();
    const parentStateHash = blake3(canonicalStringify(targetState));
    const sourceStateHash = blake3(canonicalStringify(sourceState));

    const receipt: MembraneReceipt = {
      id: `merge-${sourceBranchId}-to-${targetBranchId}-${Math.random().toString(36).substring(7)}`,
      timestamp: mergeTimestamp,
      path: targetReceipt.path,
      state: mergedState,
      branchId: targetBranchId,
      type: 'join',
      parentBranchId: targetBranchId,
      childBranchId: sourceBranchId,
      parentStateHash,
      patch: {
        sourceStateHash,
        strategy
      }
    };

    this.chain.append(receipt);
    this.currentTimestamp = mergeTimestamp;

    if (this.activeBranch === targetBranchId) {
      this.notify();
    }

    return receipt;
  }

  travelTo(timestamp: number) {
    const branchReceipts = this.getReceiptsForBranch(this.activeBranch);
    const past = branchReceipts.filter(r => r.timestamp <= timestamp);
    if (past.length > 0) {
      this.currentTimestamp = timestamp;
      this.notify();
    } else {
      throw new Error(`No state found at timestamp ${timestamp}`);
    }
  }

  getCurrentRoute(): TemporalRoute | null {
    const branchReceipts = this.getReceiptsForBranch(this.activeBranch);
    const past = branchReceipts.filter(r => r.timestamp <= this.currentTimestamp);
    if (past.length === 0) return null;
    const receipt = past[past.length - 1];
    return {
      path: receipt.path,
      state: receipt.state,
      timestamp: receipt.timestamp
    };
  }

  subscribe(callback: (route: TemporalRoute) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    const route = this.getCurrentRoute();
    if (route) {
      this.subscribers.forEach(cb => cb(route));
    }
  }
}
