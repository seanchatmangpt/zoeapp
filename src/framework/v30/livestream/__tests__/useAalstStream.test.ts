import { renderHook, act } from '@testing-library/react-native';
import { useAalstStream } from '../useAalstStream';

describe('useAalstStream', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes correctly and connects', () => {
    const { result } = renderHook(() => useAalstStream());
    expect(result.current.isConnected).toBe(true);
    expect(result.current.logs).toEqual([]);
  });

  it('adds logs over time', () => {
    const { result } = renderHook(() => useAalstStream());

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.logs.length).toBe(1);
    expect(result.current.logs[0].type).toBe('ALIGNMENT');
    expect(result.current.logs[0].payload).toBe('Sample payload for ALIGNMENT 1');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.logs.length).toBe(2);
    expect(result.current.logs[0].type).toBe('OCEL_TELEMETRY');
    expect(result.current.logs[1].type).toBe('ALIGNMENT');
  });

  it('keeps only the last 50 logs', () => {
    const { result } = renderHook(() => useAalstStream());

    act(() => {
      jest.advanceTimersByTime(55000);
    });

    expect(result.current.logs.length).toBe(50);
    expect(result.current.logs[0].id).toBe('55');
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() => useAalstStream());
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
