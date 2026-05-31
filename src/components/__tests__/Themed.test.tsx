import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View, useThemedColor } from '../Themed';
import { useColorScheme } from '../useColorScheme';

jest.mock('../useColorScheme', () => ({
  useColorScheme: jest.fn(),
}));

describe('Themed Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useThemedColor', () => {
    it('returns light theme text color', () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');
      
      const TestComponent = () => {
        const color = useThemedColor('text');
        return <Text testID="color-test">{color}</Text>;
      };
      
      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('color-test').props.children).toBe('text-light-text');
    });

    it('returns dark theme background color', () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');
      
      const TestComponent = () => {
        const color = useThemedColor('background');
        return <Text testID="color-test">{color}</Text>;
      };
      
      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('color-test').props.children).toBe('bg-dark-background');
    });
  });

  describe('Text component', () => {
    it('renders correctly with default styles', () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');
      const { getByTestId } = render(<Text testID="themed-text">Hello</Text>);
      
      const element = getByTestId('themed-text');
      expect(element.props.children).toBe('Hello');
      expect(element.props.className).toContain('text-light-text');
    });

    it('merges custom className', () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');
      const { getByTestId } = render(<Text testID="themed-text" className="font-bold">Hello</Text>);
      
      const element = getByTestId('themed-text');
      expect(element.props.className).toContain('text-dark-text');
      expect(element.props.className).toContain('font-bold');
    });
  });

  describe('View component', () => {
    it('renders correctly with default styles', () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');
      const { getByTestId } = render(<View testID="themed-view" />);
      
      const element = getByTestId('themed-view');
      expect(element.props.className).toContain('bg-light-background');
    });

    it('merges custom className', () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');
      const { getByTestId } = render(<View testID="themed-view" className="p-4" />);
      
      const element = getByTestId('themed-view');
      expect(element.props.className).toContain('bg-dark-background');
      expect(element.props.className).toContain('p-4');
    });
  });
});
