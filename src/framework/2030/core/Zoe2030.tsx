import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { GenExEngine } from '../genex/GenExEngine';
import { PredictionEngine } from '../predictive/PredictionEngine';
import { ZoeFrameworkProvider } from '../../core/ZoeFrameworkProvider';
import { ILocalInferenceEngine } from '../../ai/on-device/types';

/**
 * Zoe 2030 Context State
 */
export interface Zoe2030ContextState {
  /** The GenEx engine for autonomous UI generation */
  genEx: GenExEngine;
  /** The Prediction engine for anticipatory UX */
  predictive: PredictionEngine;
  /** Version of the 2030 frontier layer */
  version: string;
}

const Zoe2030Context = createContext<Zoe2030ContextState | undefined>(undefined);

export interface Zoe2030Props {
  children: ReactNode;
  /** On-device inference engine required for GenEx */
  inferenceEngine: ILocalInferenceEngine;
  /** Optional configuration overrides for the framework */
  config?: any;
}

/**
 * Zoe2030 Provider
 * 
 * The ultimate supreme entry point for the Zoe Framework 2030 edition.
 * It composes Auto, Fusion, and Frontier (GenEx/Predictive) capabilities
 * into a single unified orchestration layer.
 * 
 * Best Practices:
 * 1. Always wrap the root of your application with <Zoe2030 />.
 * 2. Ensure an ILocalInferenceEngine is provided for on-device frontier features.
 * 3. Use useZoe2030() hook to access the unified engine suite.
 */
export const Zoe2030: React.FC<Zoe2030Props> = ({ children, inferenceEngine, config }) => {
  const genEx = useMemo(() => new GenExEngine(inferenceEngine), [inferenceEngine]);
  const predictive = useMemo(() => new PredictionEngine(), []);

  const value = useMemo(() => ({
    genEx,
    predictive,
    version: '2030.1.0-ultimate'
  }), [genEx, predictive]);

  return (
    <Zoe2030Context.Provider value={value}>
      <ZoeFrameworkProvider {...config}>
        {children}
      </ZoeFrameworkProvider>
    </Zoe2030Context.Provider>
  );
};

/**
 * useZoe2030 Hook
 * 
 * Access the ultimate Zoe 2030 frontier capabilities.
 * 
 * @returns The composed engine suite including GenEx and Predictive layers.
 * @throws Error if used outside of a <Zoe2030 /> provider.
 */
export const useZoe2030 = (): Zoe2030ContextState => {
  const context = useContext(Zoe2030Context);
  if (!context) {
    throw new Error('useZoe2030 must be used within a Zoe2030 provider');
  }
  return context;
};
