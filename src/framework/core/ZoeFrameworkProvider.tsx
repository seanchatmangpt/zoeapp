import React, { ReactNode } from 'react';
import { SessionProvider } from '../../../context/SessionProvider';
import { VkgProvider } from '../../components/VkgProvider';
import { MembraneProvider } from './MembraneProvider';
import { MembraneConfig } from '../../lib/membrane/types';

export interface ZoeFrameworkProviderProps {
  children: ReactNode;
  membraneConfig?: Partial<MembraneConfig>;
}

/**
 * ZoeFrameworkProvider acts as the single batteries-included Root Provider for the application.
 * It elegantly wraps all fundamental framework contexts required by the system:
 * - SessionProvider: Authentication and user sessions.
 * - VkgProvider: Vector Knowledge Graph engine actor context.
 * - MembraneProvider: Security context and execution bounds.
 */
export function ZoeFrameworkProvider({ children, membraneConfig }: ZoeFrameworkProviderProps) {
  return (
    <SessionProvider>
      <VkgProvider>
        <MembraneProvider config={membraneConfig}>
          {children}
        </MembraneProvider>
      </VkgProvider>
    </SessionProvider>
  );
}
