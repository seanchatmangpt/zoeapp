import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { TemporalNavigator } from './TemporalNavigator';
import { MembraneChain } from './MembraneChain';
import { TemporalRoute, MembraneReceipt } from './types';

interface TemporalContextValue {
  navigator: TemporalNavigator;
  currentRoute: TemporalRoute | null;
  navigate: (path: string, state?: Record<string, any>) => void;
  travelTo: (timestamp: number) => void;
  fork: (newBranchId: string, parentTimestamp?: number) => MembraneReceipt;
  merge: (sourceBranchId: string, targetBranchId: string, strategy?: 'LWW' | 'CRDT') => MembraneReceipt;
  switchBranch: (branchId: string) => void;
  getActiveBranch: () => string;
  activeBranch: string;
}

const TemporalContext = createContext<TemporalContextValue | null>(null);

export const TemporalProvider: React.FC<{ children: React.ReactNode, chain?: MembraneChain }> = ({ children, chain }) => {
  const [navigator] = useState(() => new TemporalNavigator(chain || new MembraneChain()));
  const [currentRoute, setCurrentRoute] = useState<TemporalRoute | null>(navigator.getCurrentRoute());
  const [activeBranch, setActiveBranch] = useState(() => navigator.getActiveBranch());

  useEffect(() => {
    const unsubscribe = navigator.subscribe(setCurrentRoute);
    return () => {
      unsubscribe();
    };
  }, [navigator]);

  const value = useMemo(() => ({
    navigator,
    currentRoute,
    activeBranch,
    navigate: (path: string, state: Record<string, any> = {}) => navigator.navigate(path, state),
    travelTo: (timestamp: number) => navigator.travelTo(timestamp),
    fork: (newBranchId: string, parentTimestamp?: number) => {
      const receipt = navigator.fork(newBranchId, parentTimestamp);
      return receipt;
    },
    merge: (sourceBranchId: string, targetBranchId: string, strategy?: 'LWW' | 'CRDT') => {
      const receipt = navigator.merge(sourceBranchId, targetBranchId, strategy);
      return receipt;
    },
    switchBranch: (branchId: string) => {
      navigator.switchBranch(branchId);
      setActiveBranch(navigator.getActiveBranch());
    },
    getActiveBranch: () => navigator.getActiveBranch()
  }), [navigator, currentRoute, activeBranch]);

  return (
    <TemporalContext.Provider value={value}>
      {children}
    </TemporalContext.Provider>
  );
};

export const useTimeTravel = () => {
  const context = useContext(TemporalContext);
  if (!context) {
    throw new Error('useTimeTravel must be used within a TemporalProvider');
  }
  return context;
};
