import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { VkgProvider, useVkgEngine } from '../VkgProvider';
import { HookRuntime } from '../../lib/truex/hook-otp/runtime';

test('should hit line 37 by intercepting behavior', async () => {
  const spawnSpy = jest.spyOn(HookRuntime.prototype, 'spawn');
  
  const { getByTestId } = render(
    <VkgProvider>
      <div />
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
