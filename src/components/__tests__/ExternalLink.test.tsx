import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ExternalLink } from '../ExternalLink';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

jest.mock('expo-router', () => ({
  Link: ({ children, href, onPress, target, ...props }: any) => {
    const { TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity testID="external-link" onPress={onPress} {...props}>
        {children}
      </TouchableOpacity>
    );
  },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

describe('ExternalLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens WebBrowser on native platforms', () => {
    Platform.OS = 'ios';
    
    const { getByTestId } = render(
      <ExternalLink href="https://example.com">Link Text</ExternalLink>
    );
    
    const preventDefault = jest.fn();
    fireEvent.press(getByTestId('external-link'), { preventDefault });
    
    expect(preventDefault).toHaveBeenCalled();
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://example.com');
  });

  it('does not open WebBrowser on web platform', () => {
    Platform.OS = 'web';
    
    const { getByTestId } = render(
      <ExternalLink href="https://example.com">Link Text</ExternalLink>
    );
    
    const preventDefault = jest.fn();
    fireEvent.press(getByTestId('external-link'), { preventDefault });
    
    expect(preventDefault).not.toHaveBeenCalled();
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it('sets accessibilityRole to link correctly', () => {
    const { getByTestId } = render(
      <ExternalLink href="https://example.com">Link Text</ExternalLink>
    );
    const link = getByTestId('external-link');
    expect(link.props.accessibilityRole).toBe('link');
  });
});
