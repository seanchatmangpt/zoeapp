/* eslint-disable import/no-duplicates */
import { renderHook } from '@testing-library/react-native';
import { useClientOnlyValue as useClientOnlyValueNative } from '../useClientOnlyValue';
import { useClientOnlyValue as useClientOnlyValueWeb } from '../useClientOnlyValue.web';

describe('useClientOnlyValue', () => {
  describe('native implementation', () => {
    it('returns the client value immediately', () => {
      const { result } = renderHook(() => useClientOnlyValueNative('server', 'client'));
      expect(result.current).toBe('client');
    });
  });

  describe('web implementation', () => {
    it('returns client value after mount', () => {
      const { result } = renderHook(() => useClientOnlyValueWeb('server', 'client'));
      expect(result.current).toBe('client');
    });
  });
});
