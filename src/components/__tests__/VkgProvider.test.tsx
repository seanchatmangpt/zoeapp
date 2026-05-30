import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { VkgProvider, useVkgEngine } from '../VkgProvider';
import { Text, TouchableOpacity, View } from 'react-native';

function TestComponent() {
  const {
    pendingReceipts,
    processedReceipts,
    triggerHook,
    quarantinedHooks,
  } = useVkgEngine();

  return (
    <View>
      <Text testID="pending">Pending: {pendingReceipts}</Text>
      <Text testID="confirmed">Confirmed: {processedReceipts}</Text>
      <Text testID="quarantined">Quarantined: {quarantinedHooks.length}</Text>
      <TouchableOpacity
        testID="trigger-btn"
        onPress={() => triggerHook('vol-1', 'vol-cancel', 'shift-1')}
      >
        <Text>Trigger</Text>
      </TouchableOpacity>
    </View>
  );
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
  });

  afterEach(() => {
    jest.clearAllMocks();
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
});
