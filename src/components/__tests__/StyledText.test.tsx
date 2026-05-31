import React from 'react';
import { render } from '@testing-library/react-native';
import { MonoText } from '../StyledText';
import { ThemeProvider } from '../../framework/ui/theme/ThemeContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('StyledText', () => {
  it('renders correctly', () => {
    const { getByText } = render(<MonoText>Snapshot test!</MonoText>, { wrapper });
    expect(getByText('Snapshot test!')).toBeTruthy();
  });
});
