import React, { ReactNode, useEffect, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useNeuralIntent, UseNeuralIntentConfig, SensorData, IntentCommand } from './useNeuralIntent';

export interface BciContextProps {
  intent: IntentCommand;
  stress: number;
  fatigue: number;
  cognitiveLoad: number;
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  parallaxIntensity: number;
  pendingIntent: IntentCommand;
  isConfirmationRequired: boolean;
  quarantinedIntent: IntentCommand;
  confirmIntent: () => void;
  rejectIntent: () => void;
  alarmActive: boolean;
  latestReceipt: string;
}

export const BciContext = createContext<BciContextProps | null>(null);

export const useBci = () => useContext(BciContext);
export const useBciContext = () => useContext(BciContext);

export interface BciBoundaryProps extends UseNeuralIntentConfig {
  children: ReactNode;
  onIntent?: (intent: string) => void;
  // A prop to allow an external source to pump data in
  dataSource?: { subscribe: (cb: (data: SensorData) => void) => () => void };
  style?: StyleProp<ViewStyle>;
}

export function BciBoundary({ children, onIntent, dataSource, style, ...config }: BciBoundaryProps) {
  const bci = useNeuralIntent(config);
  const {
    intent,
    injectData,
    isConfirmationRequired,
    pendingIntent,
    confirmIntent,
    rejectIntent,
    alarmActive,
    resetIntent,
  } = bci;

  useEffect(() => {
    if (intent !== 'NONE' && onIntent) {
      onIntent(intent);
    }
  }, [intent, onIntent]);

  useEffect(() => {
    if (dataSource) {
      const unsubscribe = dataSource.subscribe(injectData);
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [dataSource, injectData]);

  return (
    <BciContext.Provider value={bci}>
      <View testID="bci-boundary" style={[{ flex: 1 }, style]} className="bci-boundary-container">
        {children}

        {/* Holographic Confirmation Dialog */}
        {isConfirmationRequired && (
          <View
            testID="holographic-confirm-dialog"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
            }}
          >
            <View
              style={{
                width: '80%',
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                borderRadius: 16,
                padding: 24,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                Confirm Neural Action
              </Text>
              <Text style={{ color: '#cbd5e1', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
                High stress/fatigue detected. Please confirm intent: {pendingIntent}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                <TouchableOpacity
                  testID="cancel-button"
                  onPress={rejectIntent}
                  style={{
                    flex: 1,
                    backgroundColor: '#ef4444',
                    padding: 12,
                    borderRadius: 8,
                    marginRight: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="confirm-button"
                  onPress={confirmIntent}
                  style={{
                    flex: 1,
                    backgroundColor: '#10b981',
                    padding: 12,
                    borderRadius: 8,
                    marginLeft: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Extreme Stress Alarm Banner */}
        {alarmActive && (
          <View
            testID="alarm-banner"
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              right: 20,
              backgroundColor: 'rgba(239, 68, 68, 0.95)',
              borderRadius: 8,
              padding: 16,
              zIndex: 10000,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#fca5a5',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                CRITICAL: EXTREME COGNITIVE STRESS
              </Text>
              <Text style={{ color: '#fee2e2', fontSize: 12 }}>
                Action quarantined. Neural-to-state transitions suspended.
              </Text>
            </View>
            <TouchableOpacity
              testID="dismiss-alarm-button"
              onPress={resetIntent}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 4,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </BciContext.Provider>
  );
}