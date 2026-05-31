import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View, useThemedColor } from '../Themed';
import { useColorScheme } from 'react-native';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.useColorScheme = jest.fn();
  return RN;
});

describe('Themed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useThemedColor', () => {
    const TestComponent = ({ styleType }: { styleType: 'text' | 'background' }) => {
      const color = useThemedColor(styleType);
      return <Text testID="color-text">{color}</Text>;
    };

    it('returns light text color when theme is light', () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');
      const { getByTestId } = render(<TestComponent styleType="text" />);
      expect(getByTestId('color-text').props.children).toBe('text-light-text');
    });

    it('returns dark text color when theme is dark', () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');
      const { getByTestId } = render(<TestComponent styleType="text" />);
      expect(getByTestId('color-text').props.children).toBe('text-dark-text');
    });

    it('returns light background color when theme is light', () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');
      const { getByTestId } = render(<TestComponent styleType="background" />);
      expect(getByTestId('color-text').props.children).toBe('bg-light-background');
    });

    it('returns dark background color when theme is dark', () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');
      const { getByTestId } = render(<TestComponent styleType="background" />);
      expect(getByTestId('color-text').props.children).toBe('bg-dark-background');
    });
  });

  describe('Text', () => {
    it('applies light text color class', () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');
      const { getByText } = render(<Text>Hello</Text>);
      expect(getByText('Hello').props.className).toContain('text-light-text');
    });

    it('applies dark text color class and custom className', () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');
      const { getByText } = render(<Text className="custom-class">Hello</Text>);
      expect(getByText('Hello').props.className).toContain('text-dark-text');
      expect(getByText('Hello').props.className).toContain('custom-class');
    });
  });

  describe('View', () => {
    it('applies light background color class', () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');
      const { getByTestId } = render(<View testID="view" />);
      expect(getByTestId('view').props.className).toContain('bg-light-background');
    });

    it('applies dark background color class and custom className', () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');
      const { getByTestId } = render(<View testID="view" className="custom-view" />);
      expect(getByTestId('view').props.className).toContain('bg-dark-background');
      expect(getByTestId('view').props.className).toContain('custom-view');
    });
  });
});
