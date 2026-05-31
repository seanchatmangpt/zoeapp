import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Clipboard, Alert, Animated } from 'react-native';
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
});
