import { renderHook, act } from '@testing-library/react-native';
import { usePresence } from '../usePresence';
import { supabase } from '../../../../../lib/supabase';

jest.mock('../../../../../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
  },
}));

describe('usePresence', () => {
  let mockChannel: any;
  const mockUser = { id: 'user-1', name: 'Test User' };
  const mockChannelId = 'test-channel';

  beforeEach(() => {
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation((cb) => {
        cb('SUBSCRIBED');
        return mockChannel;
      }),
      track: jest.fn().mockResolvedValue('ok'),
      presenceState: jest.fn().mockReturnValue({
        'user-1': [{ id: 'user-1', name: 'Test User' }],
      }),
      unsubscribe: jest.fn(),
    };
    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should join the channel and track presence', async () => {
    const { result } = renderHook(() =>
      usePresence({ channelId: mockChannelId, user: mockUser })
    );

    expect(supabase.channel).toHaveBeenCalledWith(`presence:${mockChannelId}`, expect.any(Object));
    expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
    expect(mockChannel.subscribe).toHaveBeenCalled();
    
    // Wait for subscribe effect
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockChannel.track).toHaveBeenCalledWith(mockUser);
  });

  it('should update presence state when sync event occurs', () => {
    let syncCallback: Function = () => {};
    mockChannel.on.mockImplementation((event: string, opts: any, cb: Function) => {
      if (event === 'presence' && opts.event === 'sync') {
        syncCallback = cb;
      }
      return mockChannel;
    });

    const { result } = renderHook(() =>
      usePresence({ channelId: mockChannelId, user: mockUser })
    );

    act(() => {
      syncCallback();
    });

    expect(result.current.users.length).toBe(1);
    expect(result.current.users[0]).toEqual(mockUser);
  });

  it('should call onSync when presence state updates', () => {
    const onSync = jest.fn();
    let syncCallback: Function = () => {};
    mockChannel.on.mockImplementation((event: string, opts: any, cb: Function) => {
      if (event === 'presence' && opts.event === 'sync') {
        syncCallback = cb;
      }
      return mockChannel;
    });

    renderHook(() =>
      usePresence({ channelId: mockChannelId, user: mockUser, onSync })
    );

    act(() => {
      syncCallback();
    });

    expect(onSync).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should handle subscription error', async () => {
    mockChannel.track.mockResolvedValue('error');
    
    const { result } = renderHook(() =>
      usePresence({ channelId: mockChannelId, user: mockUser })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('Failed to track presence');
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      usePresence({ channelId: mockChannelId, user: mockUser })
    );

    unmount();

    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });
});
