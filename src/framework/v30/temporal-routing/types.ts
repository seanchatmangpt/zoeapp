export interface MembraneReceipt {
  id: string;
  timestamp: number;
  path: string;
  state: Record<string, any>;
  patch?: Record<string, any>;
  branchId?: string;
  type?: 'navigate' | 'fork' | 'join';
  parentBranchId?: string;
  childBranchId?: string;
  parentStateHash?: string;
}

export interface TemporalRoute {
  path: string;
  state: Record<string, any>;
  timestamp: number;
}

export type Claimed<T> = { readonly __brand: 'Claimed'; readonly value: T };

export type Witnessed<T> = { readonly __brand: 'Witnessed'; readonly value: T; readonly receipt: MembraneReceipt };

export function claimValue<T>(value: T): Claimed<T> {
  return { __brand: 'Claimed', value } as Claimed<T>;
}
