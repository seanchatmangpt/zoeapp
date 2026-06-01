import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Zoe2030, useZoe2030 } from '../Zoe2030';

const mockInferenceEngine = {
  infer: jest.fn(),
} as any;

describe('Zoe2030 Ultimate Wrapper', () => {
  it('should provide genEx and predictive engines', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Zoe2030 inferenceEngine={mockInferenceEngine}>
        {children}
      </Zoe2030>
    );

    const { result } = renderHook(() => useZoe2030(), { wrapper });

    expect(result.current.genEx).toBeDefined();
    expect(result.current.predictive).toBeDefined();
    expect(result.current.version).toBe('2030.1.1-ultimate');
  });

  it('should throw error when used outside provider', () => {
    const t = () => {
      renderHook(() => useZoe2030());
    };
    expect(t).toThrow('useZoe2030 must be used within a Zoe2030 provider');
  });
});
