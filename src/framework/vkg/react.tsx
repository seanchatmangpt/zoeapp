import React, { ReactNode } from 'react';
import { VkgProvider as BaseVkgProvider, useVkgEngine as useBaseVkgEngine } from '../../components/VkgProvider';

/**
 * Contextual provider that initializes the VKG Engine and makes
 * real-time graph state, telemetry, and actions available via React Context.
 */
export const VkgProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <BaseVkgProvider>{children}</BaseVkgProvider>;
};

/**
 * DX Hook: Extracted and aliased for better readability in consumer components.
 */
export const useVkg = () => {
  return useBaseVkgEngine();
};
