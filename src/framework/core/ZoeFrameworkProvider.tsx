import React, { ReactNode, Suspense } from 'react';
import { SessionProvider } from '../../../context/SessionProvider';
import { VkgProvider } from '../../components/VkgProvider';
import { MembraneProvider } from './MembraneProvider';
import { MembraneConfig } from '../../lib/membrane/types';
import { ThemeProvider } from '../ui/theme/ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';

export interface ZoeFrameworkProviderProps {
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
}

/**
 * ZoeFrameworkProvider acts as the single batteries-included Root Provider for the application.
 * It elegantly wraps all fundamental framework contexts required by the system:
 * - ErrorBoundary: Catch and handle rendering errors gracefully.
 * - ThemeProvider: Theming and visual styling logic natively.
 * - Suspense: Declarative data fetching and lazy loading boundary.
 * - SessionProvider: Authentication and user sessions.
 * - VkgProvider: Vector Knowledge Graph engine actor context.
 * - MembraneProvider: Security context and execution bounds.
 */
export function ZoeFrameworkProvider({ 
  children, 
  membraneConfig,
  errorFallback,
  onError,
  suspenseFallback = null
}: ZoeFrameworkProviderProps) {
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
