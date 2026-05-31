import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { VkgProvider, useVkgEngine } from '../VkgProvider';
import { HookRuntime } from '../../lib/truex/hook-otp/runtime';
import { Text, TouchableOpacity, View } from 'react-native';

function TestComponent() {
  const {
    pendingReceipts,
    processedReceipts,
    triggerHook,
    quarantinedHooks,
    avatar,
    setAvatar,
    repairLastQuarantine,
  } = useVkgEngine();

  return (
    <View>
      <Text testID="avatar">{avatar}</Text>
      <Text testID="pending">Pending: {pendingReceipts}</Text>
      <Text testID="confirmed">Confirmed: {processedReceipts}</Text>
      <Text testID="quarantined">Quarantined: {quarantinedHooks.length}</Text>
      <TouchableOpacity
        testID="trigger-btn"
        onPress={() => triggerHook('vol-1', 'vol-cancel', 'shift-1')}
      >
        <Text>Trigger</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="set-avatar-btn"
        onPress={() => setAvatar('admin')}
      >
        <Text>Set Avatar Admin</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="repair-btn"
        onPress={() => repairLastQuarantine()}
      >
        <Text>Repair</Text>
      </TouchableOpacity>
    </View>
  );
}

function ErrorComponent() {
  useVkgEngine();
  return <Text>Should not render</Text>;
}

describe('VkgProvider Context Engine', () => {
  let resolveFetch: any;

  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() =>
      new Promise((resolve) => {
        resolveFetch = () => resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'settled', receipt: 'signed_edge_hash_abc' }),
        });
      })
    ) as jest.Mock;

    // Suppress console.error for the expected throw test
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should throw error when useVkgEngine is used outside VkgProvider', () => {
    expect(() => render(<ErrorComponent />)).toThrow('useVkgEngine must be used within a VkgProvider');
  });

  test('should render initial state and show optimistic pending count on trigger', async () => {
    const { getByTestId } = render(
      <VkgProvider>
        <TestComponent />
      </VkgProvider>
    );

    expect(getByTestId('pending').props.children).toEqual(['Pending: ', 0]);
    expect(getByTestId('confirmed').props.children).toEqual(['Confirmed: ', 0]);

    // Wait for VkgProvider's useEffect to run and spawn the actor
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Trigger hook mutation using fireEvent.press
    await act(async () => {
      fireEvent.press(getByTestId('trigger-btn'));
    });

    // Check that it immediately went to pending: 1 (optimistic UI)
    expect(getByTestId('pending').props.children).toEqual(['Pending: ', 1]);

    // Now resolve the mock fetch (simulating Edge authority response)
    await act(async () => {
      if (resolveFetch) resolveFetch();
    });

    // Wait a brief tick for state propagation
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Confirmed count should increase and pending clear
    expect(getByTestId('pending').props.children).toEqual(['Pending: ', 0]);
    expect(getByTestId('confirmed').props.children).toEqual(['Confirmed: ', 1]);
  });

  test('should fallback correctly if fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const { getByTestId } = render(
      <VkgProvider>
        <TestComponent />
      </VkgProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      fireEvent.press(getByTestId('trigger-btn'));
    });

    expect(getByTestId('pending').props.children).toEqual(['Pending: ', 1]);

    // Wait for fallback timeout (1500ms)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1550));
    });

    expect(getByTestId('pending').props.children).toEqual(['Pending: ', 0]);
    expect(getByTestId('confirmed').props.children).toEqual(['Confirmed: ', 1]);
  });

  test('should allow setting avatar', async () => {
    const { getByTestId } = render(
      <VkgProvider>
        <TestComponent />
      </VkgProvider>
    );

    expect(getByTestId('avatar').props.children).toEqual('member');

    await act(async () => {
      fireEvent.press(getByTestId('set-avatar-btn'));
    });

    expect(getByTestId('avatar').props.children).toEqual('admin');
  });

  test('should allow calling repairLastQuarantine without crashing', async () => {
    const { getByTestId } = render(
      <VkgProvider>
        <TestComponent />
      </VkgProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      fireEvent.press(getByTestId('repair-btn'));
    });

    // Ensure quarantined is 0 after repair call (though it was likely 0 initially in this clean test)
    expect(getByTestId('quarantined').props.children).toEqual(['Quarantined: ', 0]);
  });

  test('should hit line 37 by intercepting behavior', async () => {
    const spawnSpy = jest.spyOn(HookRuntime.prototype, 'spawn');
    
    render(
      <VkgProvider>
        <View />
      </VkgProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const behavior = spawnSpy.mock.calls[0][1] as any;
    const result = await behavior.handleDelta({ payload: { action: 'other' } } as any, { state: {} } as any);
    expect(result).toEqual([]);
    spawnSpy.mockRestore();
  });

  test('should hit line 91 by triggering quarantine telemetry', async () => {
    const registerSpy = jest.spyOn(HookRuntime.prototype, 'registerTelemetry');
    
    const { getByTestId } = render(
      <VkgProvider>
        <TestComponent />
      </VkgProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const handleTelemetry = registerSpy.mock.calls[0][0];
    
    act(() => {
      handleTelemetry({
        type: 'supervisor_intervention',
        action: 'quarantine',
        actorRef: { tenantId: 'tenant-123', packId: 'volunteer', hookId: 'volunteer_shortage', instanceId: 'default-instance' }
      });
    });

    expect(getByTestId('quarantined').props.children).toEqual(['Quarantined: ', 1]);
    registerSpy.mockRestore();
  });

  test('should hit line 120 (local evaluation error)', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const sendSpy = jest.spyOn(HookRuntime.prototype, 'send').mockImplementation(() => {
      throw 'Test send error';
    });

    const { getByTestId } = render(
      <VkgProvider>
        <TestComponent />
      </VkgProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      fireEvent.press(getByTestId('trigger-btn'));
    });

    expect(errSpy).toHaveBeenCalledWith('Local evaluation error:', 'Test send error');
    sendSpy.mockRestore();
    errSpy.mockRestore();
  });

  test('should fallback correctly if fetch returns not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    
    const { getByTestId } = render(
      <VkgProvider>
        <TestComponent />
      </VkgProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      fireEvent.press(getByTestId('trigger-btn'));
    });

    expect(getByTestId('pending').props.children).toEqual(['Pending: ', 1]);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1550));
    });

    expect(getByTestId('pending').props.children).toEqual(['Pending: ', 0]);
    expect(getByTestId('confirmed').props.children).toEqual(['Confirmed: ', 1]);
  });
});
