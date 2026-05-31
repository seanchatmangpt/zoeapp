import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { VkgProvider, useVkgEngine } from '../VkgProvider';
import { HookRuntime } from '../../lib/truex/hook-otp/runtime';
import { Text, TouchableOpacity, View } from 'react-native';

function TestComponent() {
  const { triggerHook } = useVkgEngine();
  return (
    <TouchableOpacity testID="trigger-btn" onPress={() => triggerHook('vol-1', 'vol-cancel', 'shift-1')}>
      <Text>Trigger</Text>
    </TouchableOpacity>
  );
}

test('should hit line 120', async () => {
  const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const sendSpy = jest.spyOn(HookRuntime.prototype, 'send').mockImplementation(() => {
    throw new Error('Test send error');
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
