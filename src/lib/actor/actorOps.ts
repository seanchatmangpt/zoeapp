import { create } from 'zustand';
import { VirtualKnowledgeGraphClient } from '../vkg/client';
import { ActorDispatcher, ActorSyncEngine } from './dispatcher';
import { Principal, Receipt } from './types';

// Simple global mutable state for non-hook contexts (like dispatchers and sync engines)
let globalNetworkOffline = false;
let globalRemoteRejectionMocked = false;
let globalCurrentPrincipal: Principal = { id: 'usr-admin', role: 'admin' };

export function isNetworkOffline(): boolean {
  return globalNetworkOffline;
}

export function setNetworkOffline(val: boolean) {
  globalNetworkOffline = val;
  useActorOpsStore.setState({ networkOnline: !val });
}

export function isRemoteRejectionMocked(): boolean {
  return globalRemoteRejectionMocked;
}

export function setRemoteRejectionMocked(val: boolean) {
  globalRemoteRejectionMocked = val;
  useActorOpsStore.setState({ remoteRejectActive: val });
}

export function getCurrentPrincipal(): Principal {
  return globalCurrentPrincipal;
}

export function setCurrentPrincipal(principal: Principal) {
  globalCurrentPrincipal = principal;
  useActorOpsStore.setState({ currentPrincipal: principal });
}

// Global Singletons
export const globalVkgClient = new VirtualKnowledgeGraphClient();
export const globalSyncEngine = new ActorSyncEngine();
export const globalLocalDispatcher = new ActorDispatcher(globalVkgClient, { mode: 'local', authority: 'optimistic' }, globalSyncEngine);
export const globalRemoteDispatcher = new ActorDispatcher(globalVkgClient, { mode: 'remote', authority: 'authoritative' });

interface ActorOpsState {
  networkOnline: boolean;
  remoteRejectActive: boolean;
  currentPrincipal: Principal;
  latestReceipt: Receipt | null;
  latestEvent: string | null;
  outboxCount: number;
  quarantineCount: number;
  setNetworkOnline: (online: boolean) => void;
  setRemoteRejectActive: (active: boolean) => void;
  setCurrentPrincipal: (principal: Principal) => void;
  setLatestReceipt: (receipt: Receipt | null) => void;
  setLatestEvent: (event: string | null) => void;
  setCounts: (outbox: number, quarantine: number) => void;
}

export const useActorOpsStore = create<ActorOpsState>((set) => ({
  networkOnline: !globalNetworkOffline,
  remoteRejectActive: globalRemoteRejectionMocked,
  currentPrincipal: globalCurrentPrincipal,
  latestReceipt: null,
  latestEvent: null,
  outboxCount: 0,
  quarantineCount: 0,
  setNetworkOnline: (online) => {
    globalNetworkOffline = !online;
    set({ networkOnline: online });
  },
  setRemoteRejectActive: (active) => {
    globalRemoteRejectionMocked = active;
    set({ remoteRejectActive: active });
  },
  setCurrentPrincipal: (principal) => {
    globalCurrentPrincipal = principal;
    set({ currentPrincipal: principal });
  },
  setLatestReceipt: (receipt) => set({ latestReceipt: receipt }),
  setLatestEvent: (event) => set({ latestEvent: event }),
  setCounts: (outbox, quarantine) => set({ outboxCount: outbox, quarantineCount: quarantine }),
}));
