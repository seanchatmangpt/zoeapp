import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { AdaptiveInteractionWrapper, useAdaptiveInteraction } from '../../framework/auto/ux/adaptive/AdaptiveInteractionWrapper';
import { useAppVitals } from '../../framework/admin/metrics/useAppVitals';

jest.mock('../../framework/admin/metrics/useAppVitals');
const mockUseAppVitals = useAppVitals as jest.Mock;

describe('AutonomicAdaptiveUX Validation', () => {
  it('adapts interaction parameters when performance degrades', () => {
    // 1. Normal Performance (60 FPS)
    mockUseAppVitals.mockReturnValue({ jsFps: 60, uiFps: 60 });
    const { result, rerender } = renderHook(() => useAdaptiveInteraction(), {
      wrapper: ({ children }) => (
        <AdaptiveInteractionWrapper baseHitSlop={10}>
          {children}
        </AdaptiveInteractionWrapper>
      ),
    });
    expect(result.current.animationSpeedScale).toBe(1.0);
    expect(result.current.hitSlop).toBe(10);

    // 2. Performance Degradation (15 FPS)
    mockUseAppVitals.mockReturnValue({ jsFps: 15, uiFps: 15 });
    rerender({});
    
    // avgFps < 30 -> 1.5x speed scale and 2.5x hitSlop modifier
    expect(result.current.animationSpeedScale).toBe(1.5);
    expect(result.current.hitSlop).toBe(25);
  });
});
