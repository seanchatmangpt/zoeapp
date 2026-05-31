import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Animated, Platform } from 'react-native';
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

jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const React = require('react');
  const Component = React.forwardRef(({ children, ...props }: any, ref: any) => {
    return React.createElement('View', { ...props, ref }, children);
  });
  Component.displayName = 'KeyboardAvoidingView';
  return {
    __esModule: true,
    default: Component,
  };
});

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

  test('should render KeyboardAvoidingView with correct behavior and vertical offset', () => {
    const { getByTestId } = render(<Auth />);
    const keyboardView = getByTestId('keyboard-avoiding-view');
    expect(keyboardView).toBeTruthy();
    
    const behavior = keyboardView.props.behavior;
    if (behavior !== undefined) {
      expect(behavior).toBe(Platform.OS === 'ios' ? 'padding' : 'height');
      expect(keyboardView.props.keyboardVerticalOffset).toBe(Platform.OS === 'ios' ? 40 : 0);
    } else {
      expect(behavior).toBeUndefined();
    }
  });

  test('should toggle focus styling on email and password input containers', () => {
    const { getByPlaceholderText, getByTestId } = render(<Auth />);
    
    const emailInput = getByPlaceholderText('your@email.com');
    const emailContainer = getByTestId('email-input-container');
    
    const passwordInput = getByPlaceholderText('Enter your password');
    const passwordContainer = getByTestId('password-input-container');

    // 1. Email container default border state
    expect(emailContainer.props.className).toContain('border-slate-200');
    expect(emailContainer.props.className).not.toContain('border-indigo-600');
// 2. Email container focused border state
fireEvent(emailInput, 'focus');
expect(emailContainer.props.className).toContain('border-indigo-500');
expect(emailContainer.props.className).not.toContain('border-slate-200');

// 3. Email container blurred border state
fireEvent(emailInput, 'blur');
expect(emailContainer.props.className).toContain('border-slate-200');
expect(emailContainer.props.className).not.toContain('border-indigo-500');

// 4. Password container focused border state
fireEvent(passwordInput, 'focus');
expect(passwordContainer.props.className).toContain('border-indigo-500');
expect(passwordContainer.props.className).not.toContain('border-slate-200');

    // 5. Password container blurred border state
    fireEvent(passwordInput, 'blur');
    expect(passwordContainer.props.className).toContain('border-slate-200');
    expect(passwordContainer.props.className).not.toContain('border-indigo-500');
  });

  test('should toggle password secure text entry visibility', () => {
    const { getByPlaceholderText, getByTestId, queryByTestId } = render(<Auth />);
    
    const passwordInput = getByPlaceholderText('Enter your password');
    
    expect(queryByTestId('password-visibility-toggle')).toBeNull();

    fireEvent.changeText(passwordInput, 'p');
    
    const toggleBtn = getByTestId('password-visibility-toggle');
    expect(toggleBtn).toBeTruthy();
    
    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(toggleBtn);
    expect(passwordInput.props.secureTextEntry).toBe(false);

    fireEvent.press(toggleBtn);
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  test('should display error banner when sign-in fails or has missing fields', async () => {
    const { getByPlaceholderText, getByText, queryByText, getByTestId } = render(<Auth />);
    
    const emailInput = getByPlaceholderText('your@email.com');
    const passwordInput = getByPlaceholderText('Enter your password');
    
    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'pass');
    
    const submitBtn = getPressableNode(getByText, 'Establish Secure Session');
    
    mockSignInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid credentials' }
    });

    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(getByText('Authentication Alert')).toBeTruthy();
    expect(getByText('Invalid credentials')).toBeTruthy();

    const closeBtn = getByTestId('close-banner-button');
    fireEvent.press(closeBtn);
    expect(queryByText('Authentication Alert')).toBeNull();
  });

  test('should display validation banners for sign-up requirements checklist failures', async () => {
    const { getByPlaceholderText, getByText } = render(<Auth />);
    
    const toggleBtn = getByText("Don't have an account? Sign Up");
    fireEvent.press(toggleBtn);

    const emailInput = getByPlaceholderText('your@email.com');
    const passwordInput = getByPlaceholderText('Minimum 6 characters');
    const submitBtn = getPressableNode(getByText, 'Initialize Registration');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInput, '123');

    expect(submitBtn.props.disabled).toBe(false);

    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(getByText('Please enter a valid email address')).toBeTruthy();

    fireEvent.changeText(emailInput, 'test@example.com');
    await act(async () => {
      fireEvent.press(submitBtn);
    });
    expect(getByText('Password must be at least 6 characters')).toBeTruthy();

    fireEvent.changeText(passwordInput, 'abcdef');
    await act(async () => {
      fireEvent.press(submitBtn);
    });
    expect(getByText('Password must contain at least one number')).toBeTruthy();

    fireEvent.changeText(passwordInput, 'abcdef1');
    await act(async () => {
      fireEvent.press(submitBtn);
    });
    expect(getByText('Password must contain an uppercase or special character')).toBeTruthy();

    mockSignUp.mockResolvedValueOnce({ error: null });
    fireEvent.changeText(passwordInput, 'Abcdef1');
    
    await act(async () => {
      fireEvent.press(submitBtn);
    });
    expect(getByText('Verification link sent! Check your email.')).toBeTruthy();
  });

  test('should handle missing fields directly and unexpected errors in sign-in', async () => {
    const { getByText } = render(<Auth />);
    const submitBtn = getPressableNode(getByText, 'Establish Secure Session');
    
    // forcefully call onPress to simulate missing fields bypassing disabled state
    await act(async () => {
      submitBtn.props.onPress();
    });
    expect(getByText('Please fill in all fields')).toBeTruthy();

    // Now test unexpected exception
    const { getByPlaceholderText: getByPlaceholderText2, getByText: getByText2 } = render(<Auth />);
    const emailInput = getByPlaceholderText2('your@email.com');
    const passwordInput = getByPlaceholderText2('Enter your password');
    
    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'pass');
    
    mockSignInWithPassword.mockRejectedValueOnce(new Error('Network failure'));
    
    const submitBtn2 = getPressableNode(getByText2, 'Establish Secure Session');
    await act(async () => {
      fireEvent.press(submitBtn2);
    });
    expect(getByText2('Network failure')).toBeTruthy();
  });

  test('should handle missing fields directly, auth error, and unexpected errors in sign-up', async () => {
    const { getByText, getByPlaceholderText } = render(<Auth />);
    const toggleBtn = getByText("Don't have an account? Sign Up");
    fireEvent.press(toggleBtn);

    const submitBtn = getPressableNode(getByText, 'Initialize Registration');
    
    // forcefully call onPress for missing fields
    await act(async () => {
      submitBtn.props.onPress();
    });
    expect(getByText('Please fill in all fields')).toBeTruthy();

    // Now test returned auth error
    const emailInput = getByPlaceholderText('your@email.com');
    const passwordInput = getByPlaceholderText('Minimum 6 characters');
    fireEvent.changeText(emailInput, 'dev@truex.io');
    fireEvent.changeText(passwordInput, 'Abcdef1!');

    mockSignUp.mockResolvedValueOnce({ error: { message: 'Email already in use' } });
    await act(async () => {
      fireEvent.press(submitBtn);
    });
    expect(getByText('Email already in use')).toBeTruthy();

    // Now test unexpected exception
    mockSignUp.mockRejectedValueOnce(new Error('Sign up exploded'));
    await act(async () => {
      fireEvent.press(submitBtn);
    });
    expect(getByText('Sign up exploded')).toBeTruthy();
  });

  test('should clear email input when clear button is pressed', () => {
    const { getByPlaceholderText, getByTestId, queryByTestId } = render(<Auth />);
    const emailInput = getByPlaceholderText('your@email.com');
    
    expect(queryByTestId('clear-email-button')).toBeNull();

    fireEvent.changeText(emailInput, 'test@example.com');
    expect(emailInput.props.value).toBe('test@example.com');
    
    const clearBtn = getByTestId('clear-email-button');
    expect(clearBtn).toBeTruthy();

    fireEvent.press(clearBtn);
    expect(emailInput.props.value).toBe('');
  });
});
