import React from 'react';
import { render } from '@testing-library/react-native';
import { MonoText } from '../StyledText';

describe('StyledText', () => {
  it('renders MonoText with correct font family and additional className', () => {
    const { getByText } = render(<MonoText className="extra-class">Test Mono</MonoText>);
    const element = getByText('Test Mono');
    expect(element.props.className).toContain('font-[SpaceMono]');
    expect(element.props.className).toContain('extra-class');
  });
});
