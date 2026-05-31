import { renderHook, act } from '@testing-library/react-native';
import { useCollaborationEvents } from '../useCollaborationEvents';
import { supabase } from '../../../../../lib/supabase';

jest.mock('../../../../../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
  },
}));

describe('useCollaborationEvents', () => {
  let mockChannel: any;
  const mockChannelId = 'test-channel';
  const mockEventType = 'cursor';

  beforeEach(() => {
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      send: jest.fn().mockResolvedValue('ok'),
      unsubscribe: jest.fn(),
    };
    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should subscribe to broadcast events', () => {
    const onEvent = jest.fn();
    renderHook(() =>
      useCollaborationEvents({
        channelId: mockChannelId,
        eventType: mockEventType,
        onEvent,
      })
    );

    expect(supabase.channel).toHaveBeenCalledWith(`events:${mockChannelId}`);
    expect(mockChannel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: mockEventType },
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should call onEvent when a broadcast is received', () => {
    const onEvent = jest.fn();
    let broadcastCallback: Function = () => {};
    mockChannel.on.mockImplementation((type: string, opts: any, cb: Function) => {
      if (type === 'broadcast') {
        broadcastCallback = cb;
      }
      return mockChannel;
    });

    renderHook(() =>
      useCollaborationEvents({
        channelId: mockChannelId,
        eventType: mockEventType,
        onEvent,
      })
    );

    const mockPayload = { userId: 'user-1', type: 'cursor', payload: { x: 10, y: 20 }, timestamp: Date.now() };
    act(() => {
      broadcastCallback({ payload: mockPayload });
    });

    expect(onEvent).toHaveBeenCalledWith(mockPayload);
  });

  it('should broadcast an event', () => {
    const { result } = renderHook(() =>
      useCollaborationEvents({
        channelId: mockChannelId,
        eventType: mockEventType,
      })
    );

    const payload = { x: 10, y: 20 };
    act(() => {
      result.current.broadcast('user-1', payload);
    });

    expect(mockChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: mockEventType,
      payload: expect.objectContaining({
        userId: 'user-1',
        type: mockEventType,
        payload,
        timestamp: expect.any(Number),
      }),
    });
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      useCollaborationEvents({
        channelId: mockChannelId,
        eventType: mockEventType,
      })
    );

    unmount();

    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });
});
