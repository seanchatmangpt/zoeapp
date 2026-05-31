import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { HookRuntime } from '../lib/truex/hook-otp/runtime';
import { HookActorRef, HookMessage, HookReceipt, HookBehavior } from '../lib/truex/hook-otp/types';
import { AvatarRole, AvatarProjection } from '../lib/truex/avatar/types';
import { projectHookOutput } from '../lib/truex/avatar/projector';
import { DefaultHookSupervisor } from '../lib/truex/hook-otp/supervisor';
import { stringifyActorRef } from '../lib/truex/hook-otp/actorRef';

interface VkgContextType {
  pendingReceipts: number;
  processedReceipts: number;
  quarantinedHooks: string[];
  lastReceipt: HookReceipt | null;
  avatar: AvatarRole;
  setAvatar: (role: AvatarRole) => void;
  projection: AvatarProjection | null;
  triggerHook: (subject: string, predicate: string, object: string) => Promise<void>;
  repairLastQuarantine: () => Promise<void>;
}

const VkgContext = createContext<VkgContextType | undefined>(undefined);

// Core behavior for volunteer shortages
const volunteerShortageBehavior: HookBehavior = {
  init: async () => ({
    openSlots: 4,
    candidates: ['Sarah Brown', 'Michael Green', 'David White'],
    shortageRatio: 0.5,
    serviceDate: '2026-05-24',
  }),
  handleDelta: async (msg, ctx) => {
    if (msg.payload.action === 'cancel') {
      ctx.state.openSlots += 1;
      ctx.state.shortageRatio = ctx.state.openSlots / 8;
      return [{ type: 'slot_opened', payload: { openSlots: ctx.state.openSlots } }];
    }
    return [];
  },
};

const actorRef: HookActorRef = {
  tenantId: 'tenant-123',
  packId: 'volunteer',
  hookId: 'volunteer_shortage',
  instanceId: 'default-instance',
};

const runtime = new HookRuntime();

export function VkgProvider({ children }: { children: ReactNode }) {
  const [pendingReceipts, setPendingReceipts] = useState(0);
  const [processedReceipts, setProcessedReceipts] = useState(0);
  const [quarantinedHooks, setQuarantinedHooks] = useState<string[]>([]);
  const [lastReceipt, setLastReceipt] = useState<HookReceipt | null>(null);
  const [avatar, setAvatar] = useState<AvatarRole>('member');
  const [projection, setProjection] = useState<AvatarProjection | null>(null);
  const [actorState, setActorState] = useState<any>(null);

  // Initialize runtime actor
  useEffect(() => {
    const initActor = async () => {
      const instance = await runtime.spawn(
        actorRef,
        volunteerShortageBehavior,
        new DefaultHookSupervisor(3, 10)
      );
      setActorState(instance.state);
      setProjection(projectHookOutput('volunteer_shortage', instance.state, avatar));
    };
    initActor();
  }, []);

  // Update projection whenever avatar or actor state changes
  useEffect(() => {
    if (actorState) {
      setProjection(projectHookOutput('volunteer_shortage', actorState, avatar));
    }
  }, [avatar, actorState]);

  // Telemetry listener to catch runtime events
  useEffect(() => {
    const handleTelemetry = (evt: any) => {
      if (evt.type === 'message_processed') {
        setLastReceipt(evt.receipt);
        const registry = runtime.getRegistry();
        const instance = registry.get(actorRef);
        if (instance) {
          setActorState({ ...instance.state });
        }
      } else if (evt.type === 'supervisor_intervention' && evt.action === 'quarantine') {
        setQuarantinedHooks((prev) => [...prev, stringifyActorRef(evt.actorRef)]);
      }
    };
    runtime.registerTelemetry(handleTelemetry);
    return () => runtime.unregisterTelemetry(handleTelemetry);
  }, []);

  /**
   * Triggers a hook mutation optimistically.
   * Updates local state immediately, then asynchronously pushes the delta to the Supabase Edge function.
   * If the Edge function is unreachable or fails, state gracefully falls back to local tracking.
   */
  const triggerHook = useCallback(async (subject: string, predicate: string, object: string) => {
    // 1. Optimistic pending UI updates
    setPendingReceipts((prev) => prev + 1);

    const msg: HookMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 11),
      type: 'graph_delta',
      payload: { action: 'cancel', subject, predicate, object },
      actorRef,
      timestamp: new Date().toISOString(),
    };

    // Evaluate locally
    try {
      runtime.send(actorRef, msg);
    } catch (err) {
      // In a production app, we would route this to a structured error tracking service (e.g. Sentry)
      console.error('Local evaluation error:', err instanceof Error ? err.message : err);
    }

    // 2. Simulate Outbox Sync to Supabase Edge function
    try {
      // In local testing, if Supabase is not running, we fallback gracefully
      const response = await fetch('http://127.0.0.1:54321/functions/v1/vkg-hooks-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: msg.payload }),
      });

      if (response.ok) {
        const result = await response.json();
        // Server returned Confirmed/Authoritative receipt
        setPendingReceipts((prev) => Math.max(0, prev - 1));
        setProcessedReceipts((prev) => prev + 1);
        if (result.receipt) {
          setLastReceipt({
            receiptHash: result.receipt,
            previousReceiptHash: lastReceipt?.receiptHash || 'init_chain_hash',
            hookRunId: 'run_authoritative',
            tenantId: actorRef.tenantId,
            actorRef,
            messageId: msg.id,
            inputHash: 'input_hash',
            outputHash: 'output_hash',
            deltaHash: 'delta_hash',
            status: 'Confirmed',
            avatarProjectionHashes: {},
            supervisorEvents: [],
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        throw new Error('Supabase Edge offline or returned error');
      }
    } catch (err) {
      // Local fallback in case local supabase is offline/not started
      setTimeout(() => {
        setPendingReceipts((prev) => Math.max(0, prev - 1));
        setProcessedReceipts((prev) => prev + 1);
      }, 1500);
    }
  }, [lastReceipt]);

  const repairLastQuarantine = useCallback(async () => {
    const registry = runtime.getRegistry();
    const instance = registry.get(actorRef);
    if (instance) {
      const repairMsg: HookMessage = {
        id: 'msg_repair_' + Date.now(),
        type: 'supervisor_signal',
        payload: {
          action: 'repair',
          state: {
            openSlots: 4,
            candidates: ['Sarah Brown', 'Michael Green'],
            shortageRatio: 0.5,
            serviceDate: '2026-05-24',
          },
        },
        actorRef,
        timestamp: new Date().toISOString(),
      };
      instance.quarantined = false;
      setQuarantinedHooks([]);
      runtime.send(actorRef, repairMsg);
    }
  }, []);

  return (
    <VkgContext.Provider
      value={{
        pendingReceipts,
        processedReceipts,
        quarantinedHooks,
        lastReceipt,
        avatar,
        setAvatar,
        projection,
        triggerHook,
        repairLastQuarantine,
      }}
    >
      {children}
    </VkgContext.Provider>
  );
}

export function useVkgEngine() {
  const context = useContext(VkgContext);
  if (context === undefined) {
    throw new Error('useVkgEngine must be used within a VkgProvider');
  }
  return context;
}
