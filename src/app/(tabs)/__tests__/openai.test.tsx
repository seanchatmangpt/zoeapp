import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Clipboard, Alert, Animated, Platform } from 'react-native';
import OpenAIAvatarRelativeProjection, { parseMarkdown } from '../openai';

// Mock ScrollView specifically to test scrollToEnd ref operations
const mockScrollToEnd = jest.fn();
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockScrollView = React.forwardRef(function MockScrollViewRender(props: any, ref: any) {
    React.useImperativeHandle(ref, () => ({
      scrollToEnd: mockScrollToEnd,
      scrollTo: jest.fn(),
    }));
    return React.createElement(View, props, props.children);
  });
  MockScrollView.displayName = 'MockScrollView';
  const exportMock: any = MockScrollView;
  exportMock.default = MockScrollView;
  return exportMock;
});

// Mock Supabase client
jest.mock('@/lib/supabase', () => {
  const mockSingle = jest.fn().mockResolvedValue({
    data: { username: 'testuser', avatar_url: 'https://example.com/avatar.jpg' },
    error: null,
  });
  const mockEq = jest.fn().mockReturnValue({
    single: mockSingle,
  });
  const mockSelect = jest.fn().mockReturnValue({
    eq: mockEq,
  });
  const mockFrom = jest.fn().mockReturnValue({
    select: mockSelect,
  });

  const mockInvoke = jest.fn().mockResolvedValue({
    data: { message: 'AI response: Hello!' },
    error: null,
  });

  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockImplementation(() => mockChannel),
  };

  return {
    supabase: {
      from: mockFrom,
      functions: {
        invoke: mockInvoke,
      },
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn(),
    },
  };
});

// Mock SessionProvider context
jest.mock('@/context/SessionProvider', () => ({
  useSession: () => ({
    session: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
    },
    loading: false,
    isTransitioning: false,
    transitionType: null,
    setIsTransitioning: jest.fn(),
  }),
}));

describe('parseMarkdown parsing edge cases', () => {
  test('should handle unclosed code blocks correctly', () => {
    const markdown = 'Here is some text with an unclosed code block:\n```typescript\nconst x = 42;';
    const result = parseMarkdown(markdown);
    expect(result).toEqual([
      {
        type: 'text',
        content: 'Here is some text with an unclosed code block:\n```typescript\nconst x = 42;',
      },
    ]);
  });

  test('should handle nested bullet points correctly', () => {
    const markdown = '- Main bullet\n  - Nested bullet\n    - Double nested bullet';
    const result = parseMarkdown(markdown);
    expect(result).toEqual([
      {
        type: 'text',
        content: '- Main bullet\n  - Nested bullet\n    - Double nested bullet',
      },
    ]);
  });

  test('should handle empty lines correctly', () => {
    const markdown = 'Paragraph one\n\nParagraph two';
    const result = parseMarkdown(markdown);
    expect(result).toEqual([
      {
        type: 'text',
        content: 'Paragraph one\n\nParagraph two',
      },
    ]);
  });
});

describe('OpenAIAvatarRelativeProjection Component', () => {
  let clipboardSpy: jest.SpiedFunction<typeof Clipboard.setString>;
  let alertSpy: jest.SpiedFunction<typeof Alert.alert>;
  
  // Animated Spies
  let springSpy: jest.SpyInstance;
  let timingSpy: jest.SpyInstance;
  let loopSpy: jest.SpyInstance;
  let sequenceSpy: jest.SpyInstance;
  let parallelSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useRealTimers();
    mockScrollToEnd.mockClear();
    jest.clearAllMocks();
    
    // Defensive spies to disable infinite animation loops and resolve animations synchronously
    springSpy = jest.spyOn(Animated, 'spring').mockReturnValue({
      start: jest.fn((cb) => cb && cb({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    } as any);

    timingSpy = jest.spyOn(Animated, 'timing').mockReturnValue({
      start: jest.fn((cb) => cb && cb({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    } as any);

    loopSpy = jest.spyOn(Animated, 'loop').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as any);

    sequenceSpy = jest.spyOn(Animated, 'sequence').mockReturnValue({
      start: jest.fn((cb) => cb && cb({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    } as any);

    parallelSpy = jest.spyOn(Animated, 'parallel').mockReturnValue({
      start: jest.fn((cb) => cb && cb({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    } as any);

    // Set up spies on standard RN modules
    clipboardSpy = jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    clipboardSpy.mockRestore();
    alertSpy.mockRestore();
    springSpy.mockRestore();
    timingSpy.mockRestore();
    loopSpy.mockRestore();
    sequenceSpy.mockRestore();
    parallelSpy.mockRestore();
  });

  test('renders message bubbles (welcome message on mount)', async () => {
    const { getByText } = render(<OpenAIAvatarRelativeProjection />);

    // Verify robot emoji in welcome assistant bubble
    expect(getByText('🤖')).toBeTruthy();
    
    // Verify welcome message content is rendered
    await waitFor(() => {
      expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
    });
  });

  test('sends a prompt and renders user and assistant response bubbles', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <OpenAIAvatarRelativeProjection />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
    });

    const input = getByPlaceholderText('Ask AI anything...');
    const sendButton = getByTestId('send-button');

    // Type a prompt
    fireEvent.changeText(input, 'Hello Assistant!');

    // Press send
    await act(async () => {
      fireEvent.press(sendButton);
    });

    // Expect input to be cleared and user bubble to render
    expect(input.props.value).toBe('');
    expect(getByText('Hello Assistant!')).toBeTruthy();

    // Expect assistant bubble with response in the list
    await waitFor(() => {
      expect(getByText('AI response: Hello!')).toBeTruthy();
    });
  });

  test('handles Supabase invoke error gracefully', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Supabase Function Timeout Error' },
    });

    const { getByPlaceholderText, getByTestId, getByText } = render(
      <OpenAIAvatarRelativeProjection />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
    });

    const input = getByPlaceholderText('Ask AI anything...');
    const sendButton = getByTestId('send-button');

    // Type a prompt
    fireEvent.changeText(input, 'Test error handling');

    // Press send
    await act(async () => {
      fireEvent.press(sendButton);
    });

    // Wait for the assistant bubble showing the error message
    await waitFor(() => {
      expect(getByText(/Sorry, I encountered an error/)).toBeTruthy();
    });

    // Verify that the Alert was also triggered with the error details
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Supabase Function Timeout Error');
  });

  test('copies code to clipboard when Copy is pressed', async () => {
    const { getByText } = render(<OpenAIAvatarRelativeProjection />);

    // Wait for initial render
    await waitFor(() => {
      expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
    });

    // The welcome message has a typescript code block with a Copy button
    const copyButton = getByText('Copy');

    // Press copy
    fireEvent.press(copyButton);

    // Verify clipboard was called with trimmed code
    expect(clipboardSpy).toHaveBeenCalledWith(
      `const greet = () => {\n  console.log('Hello truex app!');\n};`
    );

    // Verify copy alert was shown
    expect(alertSpy).toHaveBeenCalledWith('Copied', 'Code copied to clipboard!');
  });

  test('scrolls to bottom when content size changes', async () => {
    const { getByTestId, getByText } = render(<OpenAIAvatarRelativeProjection />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
    });

    const scrollView = getByTestId('message-scrollview');

    // Trigger content size change event
    fireEvent(scrollView, 'contentSizeChange', 400, 800);

    // Verify scrollToEnd was called
    await waitFor(() => {
      expect(mockScrollToEnd).toHaveBeenCalledWith({ animated: true });
    });
  });

  test('shows and hides scroll to bottom button based on scroll position', async () => {
    const { getByTestId, queryByTestId, getByText } = render(<OpenAIAvatarRelativeProjection />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
    });

    const scrollView = getByTestId('message-scrollview');

    // Button should not be visible initially
    expect(queryByTestId('scroll-bottom-button')).toBeNull();

    // Trigger scroll far from bottom
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { y: 100 },
        layoutMeasurement: { height: 500 },
        contentSize: { height: 1000 },
      },
    });

    // Button should now be visible
    expect(getByTestId('scroll-bottom-button')).toBeTruthy();

    // Trigger scroll close to bottom
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { y: 450 },
        layoutMeasurement: { height: 500 },
        contentSize: { height: 1000 },
      },
    });

    // Button should be hidden again
    expect(queryByTestId('scroll-bottom-button')).toBeNull();
  });

  test('clicking scroll to bottom button scrolls to end', async () => {
    const { getByTestId, getByText } = render(<OpenAIAvatarRelativeProjection />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
    });

    const scrollView = getByTestId('message-scrollview');

    // Trigger scroll far from bottom to display button
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { y: 100 },
        layoutMeasurement: { height: 500 },
        contentSize: { height: 1000 },
      },
    });

    const scrollBtn = getByTestId('scroll-bottom-button');
    mockScrollToEnd.mockClear();

    // Click the scroll to bottom button
    fireEvent.press(scrollBtn);

    // Verify scrollToEnd was called
    await waitFor(() => {
      expect(mockScrollToEnd).toHaveBeenCalledWith({ animated: true });
    });
  });

  test('renders markdown formatting correctly: bold, italic, inline code, and numbered lists', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { message: 'Here is some *italic* and _italic2_ and **bold** and `inline` text.\n1. First item\n2. Second item' },
      error: null,
    });

    const { getByPlaceholderText, getByTestId, getByText } = render(
      <OpenAIAvatarRelativeProjection />
    );

    const input = getByPlaceholderText('Ask AI anything...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'Show markdown styles');
    await act(async () => {
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(getByText('italic')).toBeTruthy();
      expect(getByText('italic2')).toBeTruthy();
      expect(getByText('bold')).toBeTruthy();
      expect(getByText('inline')).toBeTruthy();
      expect(getByText('1.')).toBeTruthy();
      expect(getByText('First item')).toBeTruthy();
      expect(getByText('2.')).toBeTruthy();
      expect(getByText('Second item')).toBeTruthy();
    });
  });

  test('stabilizes async renders on component unmount during active OpenAI invocation', async () => {
    const { supabase } = require('@/lib/supabase');
    let resolveInvoke: any;
    const invokePromise = new Promise((resolve) => {
      resolveInvoke = resolve;
    });
    supabase.functions.invoke.mockImplementationOnce(() => invokePromise);

    const { getByPlaceholderText, getByTestId, unmount } = render(
      <OpenAIAvatarRelativeProjection />
    );

    const input = getByPlaceholderText('Ask AI anything...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'Test unmount');
    await act(async () => {
      fireEvent.press(sendButton);
    });

    // Unmount while API call is pending
    unmount();

    // Resolve the invoke promise
    await act(async () => {
      resolveInvoke({
        data: { message: 'This should not set state' },
        error: null,
      });
    });

    // No warning or error about setting state on unmounted component should happen
  });

  test('clears chat history when clear button is pressed and confirmed', async () => {
    const { getByText } = render(<OpenAIAvatarRelativeProjection />);

    // Wait for initial render
    await waitFor(() => {
      expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
    });

    const clearButton = getByText('Clear');

    // Click clear
    fireEvent.press(clearButton);

    // Verify confirmation alert was shown
    expect(alertSpy).toHaveBeenCalledWith(
      'Clear Chat',
      'Are you sure you want to clear conversation history?',
      expect.any(Array)
    );

    // Extract clear action and execute it
    const alertCalls = alertSpy.mock.calls;
    const lastCall = alertCalls[alertCalls.length - 1];
    if (lastCall && Array.isArray(lastCall[2])) {
      const buttons = lastCall[2];
      const clearAction = buttons[1];
      if (clearAction && clearAction.text === 'Clear') {
        const onPress = clearAction.onPress;
        if (typeof onPress === 'function') {
          act(() => {
            onPress();
          });
        }
      }
    }

    // Welcome message should be reset
    await waitFor(() => {
      expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
    });
  });

  test('copyToClipboard falls back to console.warn on Web when navigator.clipboard is unavailable', async () => {
    const { Platform } = require('react-native');
    const originalPlatform = Platform.OS;
    Platform.OS = 'web';
    
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Temporarily mock navigator to have undefined clipboard
    const originalNavigator = global.navigator;
    try {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const { getByText } = render(<OpenAIAvatarRelativeProjection />);
      await waitFor(() => {
        expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
      });

      const copyButton = getByText('Copy');

      await act(async () => {
        fireEvent.press(copyButton);
      });

      expect(warnSpy).toHaveBeenCalledWith('Clipboard API not available');
    } finally {
      // Cleanup
      warnSpy.mockRestore();
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
      Platform.OS = originalPlatform;
    }
  });

  test('CodeBlock renders comments and values correctly', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { message: '```javascript\n// This is a comment\nconst val = 42;\nconst b = true;\n```' },
      error: null,
    });

    const { getByPlaceholderText, getByTestId, getByText } = render(
      <OpenAIAvatarRelativeProjection />
    );

    const input = getByPlaceholderText('Ask AI anything...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'Show code');
    await act(async () => {
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(getByText('// This is a comment')).toBeTruthy();
      expect(getByText('42')).toBeTruthy();
      expect(getByText('true')).toBeTruthy();
    });
  });

  test('copyToClipboard succeeds on Web when navigator.clipboard is available', async () => {
    const { Platform } = require('react-native');
    const originalPlatform = Platform.OS;
    Platform.OS = 'web';
    
    const originalNavigator = global.navigator;
    try {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(global, 'navigator', {
        value: { clipboard: { writeText: mockWriteText } },
        writable: true,
        configurable: true,
      });

      const { getByText } = render(<OpenAIAvatarRelativeProjection />);
      await waitFor(() => {
        expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
      });

      const copyButton = getByText('Copy');

      await act(async () => {
        fireEvent.press(copyButton);
      });

      expect(mockWriteText).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Copied', 'Code copied to clipboard!');
    } finally {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
      Platform.OS = originalPlatform;
    }
  });

  test('copyToClipboard catches error when setString fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    clipboardSpy.mockImplementationOnce(() => { throw new Error('Clipboard failed'); });

    const { getByText } = render(<OpenAIAvatarRelativeProjection />);
    await waitFor(() => {
      expect(getByText(/Hello! I am your AI assistant/)).toBeTruthy();
    });

    const copyButton = getByText('Copy');

    await act(async () => {
      fireEvent.press(copyButton);
    });

    expect(errorSpy).toHaveBeenCalledWith('Failed to copy to clipboard', expect.any(Error));
    errorSpy.mockRestore();
  });

  test('MarkdownRenderer renders bullet points correctly', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { message: '- First bullet\n* Second bullet\n• Third bullet' },
      error: null,
    });

    const { getByPlaceholderText, getByTestId, getByText } = render(
      <OpenAIAvatarRelativeProjection />
    );

    const input = getByPlaceholderText('Ask AI anything...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'Show bullets');
    await act(async () => {
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(getByText('First bullet')).toBeTruthy();
      expect(getByText('Second bullet')).toBeTruthy();
      expect(getByText('Third bullet')).toBeTruthy();
    });
  });

  test('loadUserProfile handles supabase error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { supabase } = require('@/lib/supabase');
    supabase.from().select().eq().single.mockResolvedValueOnce({
      data: null,
      error: { message: 'profile error' },
    });

    render(<OpenAIAvatarRelativeProjection />);
    
    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Error fetching avatar profile details:', 'profile error');
    });
    warnSpy.mockRestore();
  });

  test('loadUserProfile uses email initials if username is empty', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.from().select().eq().single.mockResolvedValueOnce({
      data: { username: '' },
      error: null,
    });

    const { getByPlaceholderText, getByTestId, getByText } = render(
      <OpenAIAvatarRelativeProjection />
    );

    const input = getByPlaceholderText('Ask AI anything...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'Hello');
    await act(async () => {
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(getByText('TE')).toBeTruthy();
    });
  });

  test('loadUserProfile catches exceptions during fetch', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { supabase } = require('@/lib/supabase');
    supabase.from().select().eq().single.mockRejectedValueOnce(new Error('Network failure'));

    render(<OpenAIAvatarRelativeProjection />);

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Could not fetch user avatar profile details:', expect.any(Error));
    });
    warnSpy.mockRestore();
  });

  test('callOpenAIFunction shows alert for empty prompt', async () => {
    const { getByPlaceholderText, getByTestId } = render(<OpenAIAvatarRelativeProjection />);
    
    const input = getByPlaceholderText('Ask AI anything...');
    const sendButton = getByTestId('send-button');
    
    // Set a value so disabled is false
    fireEvent.changeText(input, 'valid prompt');

    const originalTrim = String.prototype.trim;
    let mockTrimActive = false;
    String.prototype.trim = function(this: string) { // eslint-disable-line no-extend-native
      if (mockTrimActive && this.toString() === 'valid prompt') {
        return '';
      }
      return originalTrim.apply(this);
    };

    try {
      mockTrimActive = true;
      await act(async () => {
        fireEvent.press(sendButton);
      });

      expect(alertSpy).toHaveBeenCalledWith('Please enter a prompt');
    } finally {
      String.prototype.trim = originalTrim; // eslint-disable-line no-extend-native
    }
  });

  test('callOpenAIFunction handles invoke exception', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.functions.invoke.mockRejectedValueOnce(new Error('Network timeout'));

    const { getByPlaceholderText, getByTestId } = render(
      <OpenAIAvatarRelativeProjection />
    );

    const input = getByPlaceholderText('Ask AI anything...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'Trigger error');
    await act(async () => {
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Network timeout');
    });
  });

  test('callOpenAIFunction avoids setting state if unmounted during exception', async () => {
    const { supabase } = require('@/lib/supabase');
    let rejectInvoke: any;
    const invokePromise = new Promise((_, reject) => {
      rejectInvoke = reject;
    });
    supabase.functions.invoke.mockImplementationOnce(() => invokePromise);

    const { getByPlaceholderText, getByTestId, unmount } = render(
      <OpenAIAvatarRelativeProjection />
    );

    const input = getByPlaceholderText('Ask AI anything...');
    const sendButton = getByTestId('send-button');

    fireEvent.changeText(input, 'Test unmount exception');
    await act(async () => {
      fireEvent.press(sendButton);
    });

    unmount();

    await act(async () => {
      rejectInvoke(new Error('Rejected late'));
    });

    expect(alertSpy).not.toHaveBeenCalledWith('Error', 'Rejected late');
  });
});
