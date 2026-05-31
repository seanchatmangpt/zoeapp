import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { create } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import { CommandButton } from '../CommandButton';

// Suppress the act(...) warning globally for this file if we can't fix it,
// but we will try to fix it using setImmediate inside act.
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (/was not wrapped in act/.test(args[0])) return;
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('CommandButton', () => {
  it('renders title correctly', () => {
    const { getByText } = render(<CommandButton title="Submit" onPress={() => {}} />);
    expect(getByText('Submit')).toBeTruthy();
  });

  it('calls onPress when clicked', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<CommandButton title="Click Me" onPress={onPressMock} />);
    
    fireEvent.press(getByText('Click Me'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner when pressed and awaits promise', async () => {
    let resolvePromise: any;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    const onPressMock = jest.fn(() => promise);

    const { getByText, getByTestId, queryByText } = render(
      <CommandButton title="Async" onPress={onPressMock} testID="cmd-btn" />
    );

    fireEvent.press(getByText('Async'));
    
    // Should show spinner
    expect(getByTestId('cmd-btn-spinner')).toBeTruthy();
    expect(queryByText('Async')).toBeNull();

    // Resolve promise inside act and wait a tick
    await act(async () => {
      resolvePromise();
      await new Promise(r => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(queryByText('Async')).toBeTruthy();
    });
  });

  it('ignores press when loading to cover loading branch', async () => {
    let resolvePromise: any;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    const onPressMock = jest.fn(() => promise);

    let renderer: any;
    await act(async () => {
      renderer = create(<CommandButton title="Loading Test" onPress={onPressMock} />);
    });
    
    const touchable = renderer.root.findByType(TouchableOpacity);
    
    // First press sets loading to true
    await act(async () => {
      touchable.props.onPress();
    });
    
    // Second press should hit the if (loading) return; branch
    await act(async () => {
      touchable.props.onPress();
    });

    expect(onPressMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePromise();
      await new Promise(r => setTimeout(r, 0));
    });
  });

  it('does not call onPress if disabled', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<CommandButton title="Disabled" disabled onPress={onPressMock} />);
    
    fireEvent.press(getByText('Disabled'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('applies danger variant styling', () => {
    const { getByText } = render(<CommandButton title="Danger" variant="danger" onPress={() => {}} />);
    expect(getByText('Danger')).toBeTruthy();
  });

  it('applies secondary variant styling', () => {
    const { getByText } = render(<CommandButton title="Secondary" variant="secondary" onPress={() => {}} />);
    expect(getByText('Secondary')).toBeTruthy();
  });

  it('handles execution failure and logs error', async () => {
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation((...args) => {
      if (/was not wrapped in act/.test(args[0])) return;
    });
    
    const error = new Error('Test Error');
    let rejectPromise: any;
    const promise = new Promise((resolve, reject) => {
      rejectPromise = reject;
    });
    const onPressMock = jest.fn(() => promise);

    const { getByText } = render(<CommandButton title="Fail" onPress={onPressMock} testID="cmd-btn-fail" />);

    fireEvent.press(getByText('Fail'));

    await act(async () => {
      rejectPromise(error);
      await new Promise(r => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(consoleErrorMock).toHaveBeenCalledWith('[CommandButton] execution failed:', error);
    });

    consoleErrorMock.mockRestore();
  });

  it('applies accessibility attributes correctly', () => {
    const { getByTestId } = render(<CommandButton title="Submit" onPress={() => {}} testID="accessible-btn" />);
    const button = getByTestId('accessible-btn');
    expect(button.props.accessible).toBe(true);
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Submit');
    expect(button.props.accessibilityState).toEqual({ disabled: false, busy: false });
  });

  it('updates accessibilityState when loading/disabled', async () => {
    let resolvePromise: any;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    const onPressMock = jest.fn(() => promise);

    const { getByTestId, getByText } = render(
      <CommandButton title="Submit" onPress={onPressMock} testID="accessible-btn" />
    );

    fireEvent.press(getByText('Submit'));
    const button = getByTestId('accessible-btn');
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });

    await act(async () => {
      resolvePromise();
      await new Promise(r => setTimeout(r, 0));
    });
  });
});
