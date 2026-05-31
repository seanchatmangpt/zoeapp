import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import Auth from '../index';

// Track calls to supabase mock
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();

jest.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
    },
  },
}));

// Mock @expo/vector-icons to export Feather (and others if needed) with properties we can query.
// We make sure the custom mock returns a mock element that propagates name so we can read it.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Feather: (props: any) => {
      return React.createElement(Text, {
        testID: props.testID || `icon-${props.name}`,
        accessibilityLabel: `icon-${props.name}`,
        name: props.name,
        color: props.color,
        style: props.style,
      }, `icon-${props.name}`);
    },
  };
});

describe('Auth (Secure Gateway) Component', () => {
  let springSpy: jest.SpyInstance;
  let loopSpy: jest.SpyInstance;
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    springSpy = jest.spyOn(Animated, 'spring');
    loopSpy = jest.spyOn(Animated, 'loop').mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    }) as any);
    timingSpy = jest.spyOn(Animated, 'timing');
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();
  });

  afterEach(() => {
    springSpy.mockRestore();
    loopSpy.mockRestore();
    timingSpy.mockRestore();
    jest.clearAllMocks();
  });

  // Helper to extract checkmark icon status by searching the parent tree of requirement text
  const getCheckmarkStatus = (getByText: any, requirementText: string): string | null => {
    const textNode = getByText(requirementText);
    
    // Traverse up to find the parent container
    let container = textNode.parent;
    while (container && container.type !== 'View') {
      container = container.parent;
    }
    
    if (!container) return null;
    
    // Recursively search container's children for Feather icon
    const findFeatherIcon = (node: any): any => {
      if (!node) return null;
      if (node.props && node.props.accessibilityLabel && node.props.accessibilityLabel.startsWith('icon-')) {
        return node;
      }
      if (node.children) {
        for (const child of node.children) {
          if (typeof child === 'object') {
            const found = findFeatherIcon(child);
            if (found) return found;
          }
        }
      }
      return null;
    };
    
    const iconNode = findFeatherIcon(container);
    return iconNode ? iconNode.props.name : null;
  };

  // Helper to find the Pressable container node having the onPressIn prop
  const getPressableNode = (getByText: any, buttonText: string) => {
    const textElement = getByText(buttonText);
    let parent = textElement.parent;
    let depth = 0;
    while (parent && (!parent.props || !parent.props.onPressIn) && depth < 30) {
      parent = parent.parent;
      depth++;
    }
    return parent;
  };

  test('should render Sign In screen by default and handle sign-in flow and submit animation', async () => {
    const { getByPlaceholderText, getByText } = render(<Auth />);

    expect(getByText('Sign In to Node')).toBeTruthy();
    expect(getByText('Establish Secure Session')).toBeTruthy();

    const emailInput = getByPlaceholderText('your@email.com');
    const passwordInput = getByPlaceholderText('Enter your password');

    // Button should be disabled initially (no email or password)
    const submitBtn = getPressableNode(getByText, 'Establish Secure Session');
    expect(submitBtn.props.disabled).toBe(true);

    // Enter email and password
    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'securePass123');

    // Now button should be enabled
    expect(submitBtn.props.disabled).toBe(false);

    // Verify button press micro-interaction (scale animation)
    fireEvent(submitBtn, 'pressIn');
    expect(springSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 0.96 })
    );

    fireEvent(submitBtn, 'pressOut');
    expect(springSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 1 })
    );

    // Set up delayed promise for sign-in response
    let resolveSignIn: any;
    const signInPromise = new Promise((resolve) => {
      resolveSignIn = resolve;
    });
    mockSignInWithPassword.mockReturnValue(signInPromise);

    // Submit form
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    // Loading should be true, loader rotate animation started
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'securePass123',
    });
    expect(loopSpy).toHaveBeenCalled();
    expect(timingSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 1, duration: 1000 })
    );

    // Resolve loading promise
    await act(async () => {
      resolveSignIn({ data: {}, error: null });
    });
  });

  test('should switch to Sign Up screen, show and dynamically update security requirements, and handle registration animation', async () => {
    const { getByPlaceholderText, getByText } = render(<Auth />);

    // Toggle to Sign Up mode
    const toggleBtn = getByText("Don't have an account? Sign Up");
    fireEvent.press(toggleBtn);

    expect(getByText('Create Node Account')).toBeTruthy();
    expect(getByText('Security Requirements')).toBeTruthy();

    const emailInput = getByPlaceholderText('your@email.com');
    const passwordInput = getByPlaceholderText('Minimum 6 characters');

    // 1. Verify default requirement checkmark states (all should be unchecked/circle)
    expect(getCheckmarkStatus(getByText, 'Valid email format')).toBe('circle');
    expect(getCheckmarkStatus(getByText, 'At least 6 characters')).toBe('circle');
    expect(getCheckmarkStatus(getByText, 'Contains at least 1 number')).toBe('circle');
    expect(getCheckmarkStatus(getByText, 'Contains an uppercase or special character')).toBe('circle');

    // 2. Validate email input changes trigger email checkmark
    fireEvent.changeText(emailInput, 'invalid-email');
    expect(getCheckmarkStatus(getByText, 'Valid email format')).toBe('circle');

    fireEvent.changeText(emailInput, 'dev@truex.io');
    expect(getCheckmarkStatus(getByText, 'Valid email format')).toBe('check');

    // 3. Validate password length checkmark
    fireEvent.changeText(passwordInput, 'abcde');
    expect(getCheckmarkStatus(getByText, 'At least 6 characters')).toBe('circle');

    fireEvent.changeText(passwordInput, 'abcdef');
    expect(getCheckmarkStatus(getByText, 'At least 6 characters')).toBe('check');

    // 4. Validate password numeric checkmark
    expect(getCheckmarkStatus(getByText, 'Contains at least 1 number')).toBe('circle');
    fireEvent.changeText(passwordInput, 'abcdef1');
    expect(getCheckmarkStatus(getByText, 'Contains at least 1 number')).toBe('check');

    // 5. Validate password uppercase/special checkmark
    expect(getCheckmarkStatus(getByText, 'Contains an uppercase or special character')).toBe('circle');
    
    // Test with uppercase
    fireEvent.changeText(passwordInput, 'abcdeF1');
    expect(getCheckmarkStatus(getByText, 'Contains an uppercase or special character')).toBe('check');

    // Test with special character
    fireEvent.changeText(passwordInput, 'abcdef1!');
    expect(getCheckmarkStatus(getByText, 'Contains an uppercase or special character')).toBe('check');

    // Submit button should be enabled now
    const submitBtn = getPressableNode(getByText, 'Initialize Registration');
    expect(submitBtn.props.disabled).toBe(false);

    // Verify button press micro-interaction (scale animation)
    fireEvent(submitBtn, 'pressIn');
    expect(springSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 0.96 })
    );

    fireEvent(submitBtn, 'pressOut');
    expect(springSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 1 })
    );

    // Set up delayed promise for sign-up response
    let resolveSignUp: any;
    const signUpPromise = new Promise((resolve) => {
      resolveSignUp = resolve;
    });
    mockSignUp.mockReturnValue(signUpPromise);

    // Submit registration
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'dev@truex.io',
      password: 'abcdef1!',
    });
    expect(loopSpy).toHaveBeenCalled();
    expect(timingSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 1, duration: 1000 })
    );

    // Resolve loading promise
    await act(async () => {
      resolveSignUp({ error: null });
    });
  });
});
