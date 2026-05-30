/**
 * @fileoverview Session Context Provider
 * Manages user authentication state across the application using React Context.
 * Provides session data and loading states to all child components.
 *
 * @author Your Name
 * @version 1.0.0
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

/**
 * Session context interface
 * @interface SessionContextType
 */
interface SessionContextType {
  /** Current user session or null if not authenticated */
  session: Session | null;
  /** Loading state while session is being determined */
  loading: boolean;
  /** Whether the session is transitioning (e.g. logging in/out) */
  isTransitioning: boolean;
  /** Type of transition */
  transitionType: 'signin' | 'signout' | null;
  /** Setter for transitioning state */
  setIsTransitioning: (val: boolean) => void;
}

/**
 * React context for session management
 * Provides session state to all components in the app
 */
const SessionContext = createContext<SessionContextType>({
  session: null,
  loading: true,
  isTransitioning: false,
  transitionType: null,
  setIsTransitioning: () => {},
});

/**
 * Session provider component that wraps the app
 * Manages authentication state and provides it to child components
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 * @returns {JSX.Element} Provider component with session context
 *
 * @example
 * // Wrap your app with the session provider
 * <SessionProvider>
 *   <App />
 * </SessionProvider>
 */
export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  /** Current authentication session */
  const [session, setSession] = useState<Session | null>(null);

  /** Loading state during session initialization */
  const [loading, setLoading] = useState(true);

  /** Transition state when session changes at runtime */
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionType, setTransitionType] = useState<'signin' | 'signout' | null>(null);

  useEffect(() => {
    console.log('SessionProvider useEffect triggered');
    let initialized = false;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('SessionProvider getSession result:', session);
      setSession(session);
      setLoading(false);
      // Wait a tiny bit before setting initialized to true, to let the first auth state event pass
      setTimeout(() => {
        initialized = true;
      }, 100);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('SessionProvider onAuthStateChange event:', _event, 'session:', newSession);
      
      if (initialized) {
        setSession((prev) => {
          if (!prev && newSession) {
            setTransitionType('signin');
            setIsTransitioning(true);
          } else if (prev && !newSession) {
            setTransitionType('signout');
            setIsTransitioning(true);
          }
          return newSession;
        });
      } else {
        setSession(newSession);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Auto-clear transition state after animation finishes
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 850); // 850ms covers the navigation animation and mounting delay
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  return (
    <SessionContext.Provider
      value={{
        session,
        loading,
        isTransitioning,
        transitionType,
        setIsTransitioning,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

/**
 * Custom hook to access session context
 * Provides easy access to session state and loading status
 *
 * @hook
 * @returns {SessionContextType} Session context with current session and loading state
 *
 * @example
 * // Use in any component to access session
 * const { session, loading } = useSession();
 *
 * if (loading) return <LoadingSpinner />;
 * if (!session) return <LoginAvatarRelativeProjection />;
 * return <AuthenticatedApp />;
 */
export const useSession = () => {
  return useContext(SessionContext);
};
