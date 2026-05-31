import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from '../Themed';
import { ThemeProvider } from '../../framework/ui/theme/ThemeContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Themed Components', () => {
  it('renders Text correctly', () => {
    const { getByText } = render(<Text>Test</Text>, { wrapper });
    expect(getByText('Test')).toBeTruthy();
  });

  it('renders View correctly', () => {
    const { getByTestId } = render(<View testID="view" />, { wrapper });
    expect(getByTestId('view')).toBeTruthy();
  });
});
