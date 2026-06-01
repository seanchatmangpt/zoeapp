const fs = require('fs');

const eventsTestPath = '/Users/sac/pcp/src/framework/admin/collaboration/__tests__/useCollaborationEvents.test.ts';
const eventsTestCode = `import { renderHook, act } from '@testing-library/react-native';
import { useCollaborationEvents } from '../useCollaborationEvents';

describe('useCollaborationEvents', () => {
  const mockChannelId = 'test-channel';
  const mockEventType = 'cursor';

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize and log a warning', () => {
    renderHook(() =>
      useCollaborationEvents({
        channelId: mockChannelId,
        eventType: mockEventType,
      })
    );

    expect(console.warn).toHaveBeenCalledWith('useCollaborationEvents is stubbed');
  });

  it('should broadcast an event with a warning', () => {
    const { result } = renderHook(() =>
      useCollaborationEvents({
        channelId: mockChannelId,
        eventType: mockEventType,
      })
    );

    act(() => {
      result.current.broadcast('user-1', { x: 10, y: 20 });
    });

    expect(console.warn).toHaveBeenCalledWith('broadcast is stubbed', 'user-1', { x: 10, y: 20 });
  });
});
`;
fs.writeFileSync(eventsTestPath, eventsTestCode);

const presenceTestPath = '/Users/sac/pcp/src/framework/admin/collaboration/__tests__/usePresence.test.ts';
const presenceTestCode = `import { renderHook, act } from '@testing-library/react-native';
import { usePresence } from '../usePresence';

describe('usePresence', () => {
  const mockUser = { id: 'user-1', name: 'Test User' };
  const mockChannelId = 'test-channel';

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize and log a warning', () => {
    const { result } = renderHook(() =>
      usePresence({ channelId: mockChannelId, user: mockUser })
    );

    expect(console.warn).toHaveBeenCalledWith('usePresence is stubbed and requires a real implementation');
  });

  it('should simulate setting local user presence', () => {
    const onSync = jest.fn();
    const { result } = renderHook(() =>
      usePresence({ channelId: mockChannelId, user: mockUser, onSync })
    );

    expect(result.current.users.length).toBe(1);
    expect(result.current.users[0]).toEqual(mockUser);
    
    // onSync is called synchronously in the stub
    expect(onSync).toHaveBeenCalledWith({ [mockUser.id]: [mockUser] });
  });
});
`;
fs.writeFileSync(presenceTestPath, presenceTestCode);

console.log("Done tests");
