import React, { ReactNode, Suspense } from 'react';
import { MembraneProvider } from '@/src/framework/core/MembraneProvider';
import { MembraneConfig } from '@/src/lib/membrane/types';
import { ThemeProvider } from '@/src/framework/ui/theme/ThemeContext';
import { ErrorBoundary } from '@/src/framework/core/ErrorBoundary';

export interface PcpFrameworkProviderProps {
  /**
   * The application components to render within the framework.
   */
  children: ReactNode;
  /**
   * Configuration for the Membrane context.
   */
  membraneConfig?: Partial<MembraneConfig>;
  /**
   * Custom fallback UI for the ErrorBoundary.
   * Can be a ReactNode or a render prop function.
   */
  errorFallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  /**
   * Optional callback when an error is caught by the ErrorBoundary.
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /**
   * Fallback UI to render while children are suspending.
   */
  suspenseFallback?: ReactNode;
  
  /**
   * Provided Session context component
   */
  SessionProvider?: React.ComponentType<{children: ReactNode}>;
  
  /**
   * Provided VKG context component
   */
  VkgProvider?: React.ComponentType<{children: ReactNode}>;
}

const DefaultWrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

/**
 * PcpFrameworkProvider acts as the single batteries-included Root Provider for the application.
 */
export function PcpFrameworkProvider({ 
  children, 
  membraneConfig,
  errorFallback,
  onError,
  suspenseFallback = null,
  SessionProvider = DefaultWrapper,
  VkgProvider = DefaultWrapper
}: PcpFrameworkProviderProps) {
  return (
    <ErrorBoundary fallback={errorFallback} onError={onError}>
      <ThemeProvider>
        <SessionProvider>
          <VkgProvider>
            <MembraneProvider config={membraneConfig}>
              <Suspense fallback={suspenseFallback}>
                {children}
              </Suspense>
            </MembraneProvider>
          </VkgProvider>
        </SessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
