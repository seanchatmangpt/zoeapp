import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { AdminCard } from '../AdminCard';

describe('AdminCard', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <AdminCard testID="test-card">
        <Text>Card Content</Text>
      </AdminCard>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('renders title and subtitle when provided', () => {
    const { getByText } = render(
      <AdminCard title="Card Title" subtitle="Card Subtitle">
        <Text>Content</Text>
      </AdminCard>
    );
    expect(getByText('Card Title')).toBeTruthy();
    expect(getByText('Card Subtitle')).toBeTruthy();
  });

  it('renders headerRight component', () => {
    const { getByTestId } = render(
      <AdminCard headerRight={<View testID="custom-header-right" />}>
        <Text>Content</Text>
      </AdminCard>
    );
    expect(getByTestId('custom-header-right')).toBeTruthy();
  });

  it('does not render header section if no title, subtitle, or headerRight is provided', () => {
    const { queryByTestId } = render(
      <AdminCard testID="test-card">
        <Text>Content</Text>
      </AdminCard>
    );
    // Since there's no header elements, title/subtitle won't be rendered.
    expect(queryByTestId('test-card-title')).toBeNull();
  });

  it('applies accessibilityRole="header" to the title when provided', () => {
    const { getByTestId } = render(
      <AdminCard title="Card Title" testID="test-card">
        <Text>Content</Text>
      </AdminCard>
    );
    const titleText = getByTestId('test-card-title');
    expect(titleText.props.accessibilityRole).toBe('header');
  });
});
