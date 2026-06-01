import React from 'react';
import { View, Text, Button } from 'react-native';
import { render, act, fireEvent } from '@testing-library/react-native';
import { useAnimatedSensor, SensorType } from 'react-native-reanimated';
import { useNeuralIntent, SensorData } from '../useNeuralIntent';
import { BciBoundary } from '../BciBoundary';
import { HolographicGlassCard } from '../../../2030/ui-holographic/HolographicGlassCard';
import { HolographicContainer } from '../../../2030/ui-holographic/HolographicContainer';

// Mock react-native-reanimated's useAnimatedSensor hook
jest.mock('react-native-reanimated', () => {
  const reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...reanimated,
    useAnimatedSensor: jest.fn(),
    useAnimatedStyle: (updater: () => any) => updater(),
    interpolate: (value: number, input: number[], output: number[]) => {
      const [inMin, inMax] = input;
      const [outMin, outMax] = output;
      if (inMax === inMin) return outMin;
      const progress = (value - inMin) / (inMax - inMin);
      return outMin + progress * (outMax - outMin);
    },
    Extrapolation: {
      CLAMP: 'clamp',
    },
  };
});

// Mock GlassCard component from ui/glassmorphism since it contains sub-components
jest.mock('../../../ui/glassmorphism/GlassCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GlassCard: ({ children, style, testID, ...props }: any) => (
      <View testID={testID || "glass-card"} style={style} {...props}>
        {children}
      </View>
    ),
  };
});

// A helper component to test the hook
function HookTestComponent({ config }: { config?: any }) {
  const {
    intent,
    stress,
    fatigue,
    cognitiveLoad,
    layoutDensity,
    parallaxIntensity,
    isConfirmationRequired,
    pendingIntent,
    quarantinedIntent,
    alarmActive,
    latestReceipt,
    injectData,
    confirmIntent,
    rejectIntent,
    resetIntent,
  } = useNeuralIntent(config);
  
  return (
    <View>
      <Text testID="intent">{intent}</Text>
      <Text testID="stress">{stress.toString()}</Text>
      <Text testID="fatigue">{fatigue.toString()}</Text>
      <Text testID="cognitiveLoad">{cognitiveLoad.toString()}</Text>
      <Text testID="layoutDensity">{layoutDensity}</Text>
      <Text testID="parallaxIntensity">{parallaxIntensity.toString()}</Text>
      <Text testID="isConfirmationRequired">{isConfirmationRequired ? 'YES' : 'NO'}</Text>
      <Text testID="pendingIntent">{pendingIntent}</Text>
      <Text testID="quarantinedIntent">{quarantinedIntent}</Text>
      <Text testID="alarmActive">{alarmActive ? 'YES' : 'NO'}</Text>
      <Text testID="latestReceipt">{latestReceipt}</Text>

      <Button testID="inject-select" title="Inject Select" onPress={() => {
        // High Gamma + High fNIRS
        for (let i = 0; i < 6; i++) {
          injectData({ eegAlpha: 0.1, eegBeta: 0.1, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
        }
      }} />
      
      <Button testID="inject-scroll-down" title="Inject Scroll Down" onPress={() => {
        // High Beta
        for (let i = 0; i < 6; i++) {
          injectData({ eegAlpha: 0.1, eegBeta: 0.8, eegGamma: 0.1, fnirsO2: 0.1, timestamp: Date.now() });
        }
      }} />

      <Button testID="inject-scroll-up" title="Inject Scroll Up" onPress={() => {
        // High Alpha
        for (let i = 0; i < 6; i++) {
          injectData({ eegAlpha: 0.7, eegBeta: 0.1, eegGamma: 0.1, fnirsO2: 0.1, timestamp: Date.now() });
        }
      }} />

      <Button testID="inject-back" title="Inject Back" onPress={() => {
        // Low overall
        for (let i = 0; i < 6; i++) {
          injectData({ eegAlpha: 0.1, eegBeta: 0.1, eegGamma: 0.1, fnirsO2: 0.1, timestamp: Date.now() });
        }
      }} />

      <Button testID="inject-artifact" title="Inject Artifact" onPress={() => {
        // Artifacts
        injectData({ eegAlpha: 3.0, eegBeta: 3.0, eegGamma: 3.0, fnirsO2: 1.0, timestamp: Date.now() });
      }} />

      <Button testID="inject-single" title="Inject Single" onPress={() => {
        injectData({ eegAlpha: 0.5, eegBeta: 0.5, eegGamma: 0.5, fnirsO2: 0.5, timestamp: Date.now() });
      }} />

      <Button testID="inject-none" title="Inject None" onPress={() => {
        for (let i = 0; i < 6; i++) {
          injectData({ eegAlpha: 0.5, eegBeta: 0.5, eegGamma: 0.5, fnirsO2: 0.5, timestamp: Date.now() });
        }
      }} />

      <Button testID="inject-high-stress" title="Inject High Stress" onPress={() => {
        for (let i = 0; i < 6; i++) {
          injectData({ eegAlpha: 0.1, eegBeta: 0.5, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
        }
      }} />

      <Button testID="inject-extreme-stress" title="Inject Extreme Stress" onPress={() => {
        for (let i = 0; i < 6; i++) {
          injectData({ eegAlpha: 0.1, eegBeta: 0.8, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
        }
      }} />

      <Button testID="confirm-action" title="Confirm" onPress={confirmIntent} />
      <Button testID="reject-action" title="Reject" onPress={rejectIntent} />
      <Button testID="reset" title="Reset" onPress={resetIntent} />
    </View>
  );
}

describe('useNeuralIntent', () => {
  const mockSensorValue = {
    roll: 0.2,
    pitch: -0.3,
    yaw: 0.1,
  };

  const mockSensor = {
    sensor: {
      value: mockSensorValue,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAnimatedSensor as jest.Mock).mockReturnValue(mockSensor);
  });

  it('should initialize with NONE intent', () => {
    const { getByTestId } = render(<HookTestComponent />);
    expect(getByTestId('intent').props.children).toBe('NONE');
  });

  it('should not change intent if buffer is not full', () => {
    const { getByTestId } = render(<HookTestComponent />);
    act(() => {
      fireEvent.press(getByTestId('inject-single'));
    });
    expect(getByTestId('intent').props.children).toBe('NONE');
  });

  it('should detect SELECT intent', () => {
    const { getByTestId } = render(<HookTestComponent />);
    act(() => {
      fireEvent.press(getByTestId('inject-select'));
    });
    expect(getByTestId('intent').props.children).toBe('SELECT');
  });

  it('should detect SCROLL_DOWN intent', () => {
    const { getByTestId } = render(<HookTestComponent />);
    act(() => {
      fireEvent.press(getByTestId('inject-scroll-down'));
    });
    expect(getByTestId('intent').props.children).toBe('SCROLL_DOWN');
  });

  it('should detect SCROLL_UP intent', () => {
    const { getByTestId } = render(<HookTestComponent />);
    act(() => {
      fireEvent.press(getByTestId('inject-scroll-up'));
    });
    expect(getByTestId('intent').props.children).toBe('SCROLL_UP');
  });

  it('should detect BACK intent', () => {
    const { getByTestId } = render(<HookTestComponent />);
    act(() => {
      fireEvent.press(getByTestId('inject-back'));
    });
    expect(getByTestId('intent').props.children).toBe('BACK');
  });

  it('should reject artifacts', () => {
    const { getByTestId } = render(<HookTestComponent />);
    act(() => {
      fireEvent.press(getByTestId('inject-artifact'));
    });
    expect(getByTestId('intent').props.children).toBe('NONE');
  });

  it('should remain NONE if thresholds are not met', () => {
    const { getByTestId } = render(<HookTestComponent />);
    act(() => {
      fireEvent.press(getByTestId('inject-none'));
    });
    expect(getByTestId('intent').props.children).toBe('NONE');
  });

  it('should reset intent', () => {
    const { getByTestId } = render(<HookTestComponent />);
    act(() => {
      fireEvent.press(getByTestId('inject-select'));
    });
    expect(getByTestId('intent').props.children).toBe('SELECT');
    
    act(() => {
      fireEvent.press(getByTestId('reset'));
    });
    expect(getByTestId('intent').props.children).toBe('NONE');
  });

  it('should fallback to default config values', () => {
    const { getByTestId } = render(<HookTestComponent config={undefined} />);
    act(() => {
      fireEvent.press(getByTestId('inject-select'));
    });
    expect(getByTestId('intent').props.children).toBe('SELECT');
  });

  describe('Cognitive Load Simulation Telemetry', () => {
    it('should calculate stress, fatigue, and cognitive load correctly', () => {
      const { getByTestId } = render(<HookTestComponent />);
      
      // Initially zero
      expect(getByTestId('stress').props.children).toBe('0');
      expect(getByTestId('fatigue').props.children).toBe('0');
      
      act(() => {
        fireEvent.press(getByTestId('inject-select'));
      });
      
      // For inject-select:
      // avgAlpha = 0.1, avgBeta = 0.1, avgGamma = 0.9, avgFnirs = 0.6
      // stress = 0.1 * 0.5 + 0.9 * 0.3 + 0.9 * 0.2 = 0.50
      // fatigue = 0.1 * 0.6 + 0.4 * 0.4 = 0.22
      // cognitiveLoad = 0.1 * 0.4 + 0.9 * 0.4 + 0.6 * 0.2 = 0.04 + 0.36 + 0.12 = 0.52
      expect(parseFloat(getByTestId('stress').props.children)).toBeCloseTo(0.5);
      expect(parseFloat(getByTestId('fatigue').props.children)).toBeCloseTo(0.22);
      expect(parseFloat(getByTestId('cognitiveLoad').props.children)).toBeCloseTo(0.52);
    });

    it('should adjust layout density and parallax intensity based on stress levels', () => {
      const config = {
        stressThreshold: 0.6,
        extremeStressThreshold: 0.8,
      };
      const { getByTestId } = render(<HookTestComponent config={config} />);

      // Low stress (initial)
      expect(getByTestId('layoutDensity').props.children).toBe('compact');
      expect(getByTestId('parallaxIntensity').props.children).toBe('15');

      // High stress injection (stress = 0.70)
      act(() => {
        fireEvent.press(getByTestId('inject-high-stress'));
      });
      expect(getByTestId('layoutDensity').props.children).toBe('comfortable');
      expect(getByTestId('parallaxIntensity').props.children).toBe('8');

      // Reset
      act(() => {
        fireEvent.press(getByTestId('reset'));
      });

      // Extreme stress injection (stress = 0.85)
      act(() => {
        fireEvent.press(getByTestId('inject-extreme-stress'));
      });
      expect(getByTestId('layoutDensity').props.children).toBe('spacious');
      expect(getByTestId('parallaxIntensity').props.children).toBe('2');
    });
  });

  describe('3-Tier Confirmation Safety Gate', () => {
    it('should allow immediate execution for low stress intents', () => {
      const config = {
        stressThreshold: 0.6,
        extremeStressThreshold: 0.8,
      };
      const { getByTestId } = render(<HookTestComponent config={config} />);
      
      act(() => {
        fireEvent.press(getByTestId('inject-select')); // stress = 0.50
      });
      
      expect(getByTestId('intent').props.children).toBe('SELECT');
      expect(getByTestId('isConfirmationRequired').props.children).toBe('NO');
      expect(getByTestId('latestReceipt').props.children).not.toBe('genesis-bci-receipt-hash');
    });

    it('should require confirmation and execute on confirm for high stress intents', () => {
      const config = {
        stressThreshold: 0.6,
        extremeStressThreshold: 0.8,
      };
      const { getByTestId } = render(<HookTestComponent config={config} />);
      
      act(() => {
        fireEvent.press(getByTestId('inject-high-stress')); // stress = 0.70
      });
      
      // Action is pending, not executed yet
      expect(getByTestId('intent').props.children).toBe('NONE');
      expect(getByTestId('isConfirmationRequired').props.children).toBe('YES');
      expect(getByTestId('pendingIntent').props.children).toBe('SELECT');
      
      // Confirm the action
      act(() => {
        fireEvent.press(getByTestId('confirm-action'));
      });
      
      expect(getByTestId('intent').props.children).toBe('SELECT');
      expect(getByTestId('isConfirmationRequired').props.children).toBe('NO');
    });

    it('should require confirmation and discard on reject for high stress intents', () => {
      const config = {
        stressThreshold: 0.6,
        extremeStressThreshold: 0.8,
      };
      const { getByTestId } = render(<HookTestComponent config={config} />);
      
      act(() => {
        fireEvent.press(getByTestId('inject-high-stress')); // stress = 0.70
      });
      
      expect(getByTestId('intent').props.children).toBe('NONE');
      expect(getByTestId('isConfirmationRequired').props.children).toBe('YES');
      
      // Reject the action
      act(() => {
        fireEvent.press(getByTestId('reject-action'));
      });
      
      expect(getByTestId('intent').props.children).toBe('NONE');
      expect(getByTestId('isConfirmationRequired').props.children).toBe('NO');
      expect(getByTestId('pendingIntent').props.children).toBe('NONE');
    });

    it('should quarantine and trigger alarm for extreme stress intents', () => {
      const onAlarmMock = jest.fn();
      const config = {
        stressThreshold: 0.6,
        extremeStressThreshold: 0.8,
        onAlarm: onAlarmMock,
      };
      const { getByTestId } = render(<HookTestComponent config={config} />);
      
      act(() => {
        fireEvent.press(getByTestId('inject-extreme-stress')); // stress = 0.85
      });
      
      // Action is quarantined, alarm is active
      expect(getByTestId('intent').props.children).toBe('NONE');
      expect(getByTestId('alarmActive').props.children).toBe('YES');
      expect(getByTestId('quarantinedIntent').props.children).toBe('SELECT');
      
      expect(onAlarmMock).toHaveBeenCalled();
      const alarmEvent = onAlarmMock.mock.calls[0][0];
      expect(alarmEvent.intent).toBe('SELECT');
      expect(parseFloat(alarmEvent.stress)).toBeCloseTo(0.85);
      expect(alarmEvent.receipt).toBeDefined();
    });
  });
});

describe('BciBoundary', () => {
  const mockSensorValue = {
    roll: 0.2,
    pitch: -0.3,
    yaw: 0.1,
  };

  const mockSensor = {
    sensor: {
      value: mockSensorValue,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAnimatedSensor as jest.Mock).mockReturnValue(mockSensor);
  });

  it('renders children correctly', () => {
    const { getByTestId, getByText } = render(
      <BciBoundary>
        <Text>Test Child</Text>
      </BciBoundary>
    );
    expect(getByTestId('bci-boundary')).toBeTruthy();
    expect(getByText('Test Child')).toBeTruthy();
  });

  it('triggers onIntent callback when intent changes', () => {
    const onIntentMock = jest.fn();
    
    // We create a mock data source to pump data in
    let emitData: (data: SensorData) => void = () => {};
    const dataSource = {
      subscribe: (cb: (data: SensorData) => void) => {
        emitData = cb;
        return () => {};
      }
    };

    render(
      <BciBoundary onIntent={onIntentMock} dataSource={dataSource} smoothingWindow={2}>
        <Text>Test Child</Text>
      </BciBoundary>
    );

    act(() => {
      emitData({ eegAlpha: 0.1, eegBeta: 0.1, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
      emitData({ eegAlpha: 0.1, eegBeta: 0.1, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
    });

    expect(onIntentMock).toHaveBeenCalledWith('SELECT');
  });

  it('cleans up data source subscription', () => {
    const unsubscribeMock = jest.fn();
    const dataSource = {
      subscribe: () => unsubscribeMock
    };

    const { unmount } = render(
      <BciBoundary dataSource={dataSource}>
        <Text>Test Child</Text>
      </BciBoundary>
    );

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('handles dataSource with undefined unsubscribe correctly', () => {
    const dataSource = {
      subscribe: () => undefined as any // returning undefined to test robustness
    };

    const { unmount } = render(
      <BciBoundary dataSource={dataSource}>
        <Text>Test Child</Text>
      </BciBoundary>
    );

    expect(() => {
      unmount();
    }).not.toThrow();
  });

  describe('Safety UI Gates Rendering', () => {
    it('should render confirmation overlay under high stress and handle confirm/cancel clicks', () => {
      let emitData: (data: SensorData) => void = () => {};
      const dataSource = {
        subscribe: (cb: (data: SensorData) => void) => {
          emitData = cb;
          return () => {};
        }
      };
      
      const onIntentMock = jest.fn();

      const { getByTestId, queryByTestId } = render(
        <BciBoundary
          onIntent={onIntentMock}
          dataSource={dataSource}
          smoothingWindow={2}
          stressThreshold={0.6}
          extremeStressThreshold={0.8}
        >
          <Text>Child component</Text>
        </BciBoundary>
      );

      // Verify overlay is not present initially
      expect(queryByTestId('holographic-confirm-dialog')).toBeNull();

      // Emit high stress SELECT intent signals
      act(() => {
        emitData({ eegAlpha: 0.1, eegBeta: 0.5, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
        emitData({ eegAlpha: 0.1, eegBeta: 0.5, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
      });

      // Verify overlay is now visible
      expect(getByTestId('holographic-confirm-dialog')).toBeTruthy();
      expect(onIntentMock).not.toHaveBeenCalled();

      // Click Confirm
      act(() => {
        fireEvent.press(getByTestId('confirm-button'));
      });

      // Verify callback called, overlay dismissed
      expect(onIntentMock).toHaveBeenCalledWith('SELECT');
      expect(queryByTestId('holographic-confirm-dialog')).toBeNull();
    });

    it('should render alarm banner under extreme stress and dismiss when reset clicked', () => {
      let emitData: (data: SensorData) => void = () => {};
      const dataSource = {
        subscribe: (cb: (data: SensorData) => void) => {
          emitData = cb;
          return () => {};
        }
      };
      
      const onAlarmMock = jest.fn();

      const { getByTestId, queryByTestId } = render(
        <BciBoundary
          onAlarm={onAlarmMock}
          dataSource={dataSource}
          smoothingWindow={2}
          stressThreshold={0.6}
          extremeStressThreshold={0.8}
        >
          <Text>Child component</Text>
        </BciBoundary>
      );

      // Verify banner is not present initially
      expect(queryByTestId('alarm-banner')).toBeNull();

      // Emit extreme stress SELECT signals
      act(() => {
        emitData({ eegAlpha: 0.1, eegBeta: 0.8, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
        emitData({ eegAlpha: 0.1, eegBeta: 0.8, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
      });

      // Verify alarm banner is visible
      expect(getByTestId('alarm-banner')).toBeTruthy();
      expect(onAlarmMock).toHaveBeenCalled();

      // Press Reset button
      act(() => {
        fireEvent.press(getByTestId('dismiss-alarm-button'));
      });

      // Verify banner dismissed
      expect(queryByTestId('alarm-banner')).toBeNull();
    });
  });

  describe('Holographic Card Integration', () => {
    it('should adjust HolographicGlassCard padding dynamically based on layout density', () => {
      let emitData: (data: SensorData) => void = () => {};
      const dataSource = {
        subscribe: (cb: (data: SensorData) => void) => {
          emitData = cb;
          return () => {};
        }
      };

      const { getByTestId } = render(
        <BciBoundary dataSource={dataSource} smoothingWindow={2} stressThreshold={0.6} extremeStressThreshold={0.8}>
          <HolographicGlassCard testID="holographic-card">
            <Text>Card Content</Text>
          </HolographicGlassCard>
        </BciBoundary>
      );

      // 1. Initial State (Low stress/normal => compact => padding: 8)
      let card = getByTestId('holographic-card');
      expect(card.props.style).toEqual([{ padding: 8 }, undefined]);

      // 2. High stress (comfortable => padding: 16)
      act(() => {
        emitData({ eegAlpha: 0.1, eegBeta: 0.5, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
        emitData({ eegAlpha: 0.1, eegBeta: 0.5, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
      });

      card = getByTestId('holographic-card');
      expect(card.props.style).toEqual([{ padding: 16 }, undefined]);

      // 3. Extreme stress (spacious => padding: 24)
      act(() => {
        emitData({ eegAlpha: 0.1, eegBeta: 0.8, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
        emitData({ eegAlpha: 0.1, eegBeta: 0.8, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
      });

      card = getByTestId('holographic-card');
      expect(card.props.style).toEqual([{ padding: 24 }, undefined]);
    });

    it('should throttle parallax intensity animation under high and extreme stress', () => {
      let emitData: (data: SensorData) => void = () => {};
      const dataSource = {
        subscribe: (cb: (data: SensorData) => void) => {
          emitData = cb;
          return () => {};
        }
      };

      const { getByTestId } = render(
        <HolographicContainer isEnabled={true}>
          <BciBoundary dataSource={dataSource} smoothingWindow={2} stressThreshold={0.6} extremeStressThreshold={0.8}>
            <HolographicGlassCard testID="holographic-card">
              <Text>Card Content</Text>
            </HolographicGlassCard>
          </BciBoundary>
        </HolographicContainer>
      );

      // Low stress (initial)
      let card = getByTestId('holographic-card');
      let contentLayer = card.props.children[1];
      let style = contentLayer.props.style[1];
      let translateXObj = style.transform.find((t: any) => t.translateX !== undefined);
      const lowStressX = Math.abs(translateXObj.translateX);

      // High stress
      act(() => {
        emitData({ eegAlpha: 0.1, eegBeta: 0.5, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
        emitData({ eegAlpha: 0.1, eegBeta: 0.5, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
      });

      card = getByTestId('holographic-card');
      contentLayer = card.props.children[1];
      style = contentLayer.props.style[1];
      translateXObj = style.transform.find((t: any) => t.translateX !== undefined);
      const highStressX = Math.abs(translateXObj.translateX);

      expect(highStressX).toBeLessThan(lowStressX);

      // Extreme stress
      act(() => {
        emitData({ eegAlpha: 0.1, eegBeta: 0.8, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
        emitData({ eegAlpha: 0.1, eegBeta: 0.8, eegGamma: 0.9, fnirsO2: 0.6, timestamp: Date.now() });
      });

      card = getByTestId('holographic-card');
      contentLayer = card.props.children[1];
      style = contentLayer.props.style[1];
      translateXObj = style.transform.find((t: any) => t.translateX !== undefined);
      const extremeStressX = Math.abs(translateXObj.translateX);

      expect(extremeStressX).toBeLessThan(highStressX);
    });
  });
});
