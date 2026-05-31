import { ErrorAnalysis, SuggestedFix } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

/**
 * Analyzes an error and its stack trace to suggest potential fixes.
 * 
 * @param error - The caught error object
 * @returns An ErrorAnalysis object containing causes and suggestions
 */
export function analyzeError(error: Error): ErrorAnalysis {
  const stack = error.stack || '';
  const message = error.message.toLowerCase();
  const causes: string[] = [];
  const suggestions: SuggestedFix[] = [];
  let isStateRelated = false;

  // 1. Check for state-related errors
  if (
    message.includes('null is not an object') ||
    message.includes('undefined is not an object') ||
    message.includes('cannot read property') ||
    message.includes('json') ||
    stack.includes('zustand') ||
    stack.includes('storage')
  ) {
    isStateRelated = true;
    causes.push('Potential corrupted local state or unexpected data structure.');
    
    suggestions.push({
      id: 'wipe-state',
      title: 'Clear Local Cache',
      description: 'Wipes all locally cached data and restarts the app. This often fixes issues caused by stale or corrupted data.',
      impact: 'high',
      action: async () => {
        await AsyncStorage.clear();
        storage.clearAll();
        // In a real app, we might want to trigger a full reload
        // DevSettings.reload() if available, or just reset state
      }
    });
  }

  // 2. Check for network/auth related errors
  if (message.includes('network') || message.includes('auth') || message.includes('fetch') || message.includes('401') || message.includes('403')) {
    causes.push('Network or authentication failure.');
    suggestions.push({
      id: 're-auth',
      title: 'Reset Session',
      description: 'Clears your current session and takes you back to login.',
      impact: 'medium',
      action: async () => {
        await AsyncStorage.removeItem('supabase.auth.token'); // Example key
        // Navigation logic would go here
      }
    });
  }

  // 3. Generic rollback suggestion
  suggestions.push({
    id: 'rollback',
    title: 'Safe Rollback',
    description: 'Attempts to return to the previous known stable screen.',
    impact: 'low',
    action: () => {
      // Logic to go back in navigation history
    }
  });

  return {
    causes,
    suggestions,
    isStateRelated,
  };
}
