import { useState, useCallback, useMemo, useEffect } from 'react';
import { CRDT } from './types';

/**
 * Hook to manage CRDT state in a React component.
 * Provides the current value and a way to update it.
 */
export function useCrdtState<TState, TDelta, TCRDT extends CRDT<TState, TDelta>, TValue>(
  factory: (peerId: string, initialState?: TState) => TCRDT,
  peerId: string,
  initialState?: TState,
  getValue?: (crdt: TCRDT) => TValue
): [TValue, TCRDT, (other: TState | TDelta) => void] {
  const crdt = useMemo(() => factory(peerId, initialState), [factory, peerId, initialState]);
  const [internalState, setInternalState] = useState<TState>(() => crdt.state);

  const value = useMemo(() => (getValue ? getValue(crdt) : (crdt as any).value as TValue), [crdt, internalState, getValue]);

  const merge = useCallback((other: TState | TDelta) => {
    crdt.merge(other);
    setInternalState(crdt.state);
  }, [crdt]);

  // We need a way to trigger re-renders when the CRDT is mutated locally.
  // Since the CRDT instance is stable (via useMemo), we can wrap its mutation methods
  // or provide a proxy. For simplicity, we'll expect the user to use the crdt instance
  // and we might need a forceUpdate or a wrapper.

  return [value, crdt, merge];
}

/**
 * Specialized hook for LWWRegister.
 */
import { LWWRegister } from './register';
import { LWWRegisterState } from './types';

export function useLWWRegister<T>(
  peerId: string,
  initialValue: T
): [T, (val: T) => void, (state: LWWRegisterState<T>) => void] {
  const [value, crdt, merge] = useCrdtState<LWWRegisterState<T>, LWWRegisterState<T>, LWWRegister<T>, T>(
    (pid, initial) => new LWWRegister(pid, initial?.value ?? initialValue, initial?.timestamp),
    peerId,
    undefined,
    (c) => c.value
  );

  const [localValue, setLocalValue] = useState(value);
  
  // Update local value when CRDT value changes (e.g. via merge)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const setValue = useCallback((val: T) => {
    crdt.set(val);
    setLocalValue(crdt.value);
  }, [crdt]);

  return [localValue, setValue, merge];
}

/**
 * Specialized hook for PNCounter.
 */
import { PNCounter } from './counter';
import { PNCounterState } from './types';

export function usePNCounter(
  peerId: string,
  initialValue: number = 0
): [number, { increment: (amt?: number) => void; decrement: (amt?: number) => void }, (state: PNCounterState) => void] {
  const [value, crdt, merge] = useCrdtState<PNCounterState, PNCounterState, PNCounter, number>(
    (pid) => new PNCounter(pid),
    peerId,
    undefined,
    (c) => c.value
  );

  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  const ops = useMemo(() => ({
    increment: (amt?: number) => {
      crdt.increment(amt);
      forceUpdate();
    },
    decrement: (amt?: number) => {
      crdt.decrement(amt);
      forceUpdate();
    }
  }), [crdt, forceUpdate]);

  return [value, ops, merge];
}

/**
 * Specialized hook for LWWMap.
 */
import { LWWMap } from './map';
import { LWWMapState } from './types';

export function useLWWMap<V>(
  peerId: string,
  initialState: LWWMapState<V> = {}
): [LWWMapState<V>, { set: (key: string, val: V) => void; delete: (key: string) => void; get: (key: string) => V | undefined }, (state: LWWMapState<V>) => void] {
  const [state, crdt, merge] = useCrdtState<LWWMapState<V>, LWWMapState<V>, LWWMap<V>, LWWMapState<V>>(
    (pid, initial) => new LWWMap(pid, initial ?? initialState),
    peerId,
    undefined,
    (c) => c.state
  );

  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  const ops = useMemo(() => ({
    set: (key: string, val: V) => {
      crdt.set(key, val);
      forceUpdate();
    },
    delete: (key: string) => {
      crdt.delete(key);
      forceUpdate();
    },
    get: (key: string) => crdt.get(key)
  }), [crdt, forceUpdate]);

  return [state, ops, merge];
}
